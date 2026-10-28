import axios from 'axios';
import { ParsedResumeData } from './gemini';
import { matchJobsWithGemini, JobMatchResult } from './gemini';

export interface JobListing {
  externalId: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  description: string;
  requirements: string[];
  matchScore: number;
  matchReasons?: string[];
  recommendation?: 'strong_apply' | 'consider' | 'skip';
  source: string;
  url: string;
  postedDate: string;
}

// JSearch API configuration
const JSEARCH_API_KEY = process.env.VITE_JSEARCH_API_KEY || '';
const JSEARCH_BASE_URL = 'https://jsearch-proxy.p.rapidapi.com/v1/search';

// Calculate match score using Gemini AI (primary) with local fallback
export async function calculateMatchScoreWithGemini(
  resume: ParsedResumeData,
  jobs: any[]
): Promise<Map<string, JobMatchResult>> {
  const matchMap = new Map<string, JobMatchResult>();
  
  // Try Gemini first (batch all jobs)
  try {
    const result = await matchJobsWithGemini(resume, jobs);
    
    if (result.success && result.data) {
      result.data.forEach(match => {
        matchMap.set(match.jobId, match);
      });
      return matchMap;
    }
  } catch (error) {
    console.warn('Gemini job matching failed, using local fallback:', error);
  }
  
  // Fallback to local matching
  jobs.forEach(job => {
    const localScore = calculateMatchScoreLocal(resume, job);
    matchMap.set(job.externalId || job.id, {
      jobId: job.externalId || job.id,
      matchScore: localScore,
      reasons: ['Matched based on skills and experience'],
      missingSkills: [],
      recommendation: localScore >= 85 ? 'strong_apply' : localScore >= 70 ? 'consider' : 'skip'
    });
  });
  
  return matchMap;
}

// Local fallback match score calculator
function calculateMatchScoreLocal(resume: ParsedResumeData, job: any): number {
  let score = 0;
  let maxScore = 0;

  // Skills match (40% weight)
  const jobSkills = extractSkillsFromJob(job);
  const matchedSkills = resume.skills.filter(skill => 
    jobSkills.some(jobSkill => 
      jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(jobSkill.toLowerCase())
    )
  );
  
  if (jobSkills.length > 0) {
    score += (matchedSkills.length / jobSkills.length) * 40;
  }
  maxScore += 40;

  // Title match (30% weight)
  const resumeTitleKeywords = extractKeywordsFromExperience(resume);
  const jobTitleLower = job.title?.toLowerCase() || '';
  
  const titleMatches = resumeTitleKeywords.filter(keyword => 
    jobTitleLower.includes(keyword.toLowerCase())
  );
  
  if (resumeTitleKeywords.length > 0) {
    score += (titleMatches.length / Math.min(resumeTitleKeywords.length, 3)) * 30;
  }
  maxScore += 30;

  // Experience level match (20% weight)
  const experienceYears = calculateExperienceYears(resume);
  const jobLevel = detectJobLevel(job.title || '');
  
  if (jobLevel === 'senior' && experienceYears >= 5) score += 20;
  else if (jobLevel === 'mid' && experienceYears >= 3) score += 20;
  else if (jobLevel === 'junior' && experienceYears >= 1) score += 20;
  else if (jobLevel === 'entry') score += 15;
  maxScore += 20;

  // Location match (10% weight)
  const jobLocation = (job.job_city || job.job_country || job.location || '').toLowerCase();
  if (jobLocation.includes('remote') || jobLocation === '') {
    score += 10;
  }
  maxScore += 10;

  return Math.round((score / maxScore) * 100);
}

function extractSkillsFromJob(job: any): string[] {
  const text = `${job.job_title || job.title || ''} ${job.job_description || job.description || ''} ${job.job_required_skills || job.requirements?.join(' ') || ''}`.toLowerCase();
  
  const commonSkills = [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'node', 'python', 'java',
    'sql', 'aws', 'docker', 'kubernetes', 'git', 'rest', 'graphql', 'html', 'css',
    'mongodb', 'postgresql', 'redis', 'ci/cd', 'agile', 'scrum'
  ];
  
  return commonSkills.filter(skill => text.includes(skill));
}

function extractKeywordsFromExperience(resume: ParsedResumeData): string[] {
  const keywords: string[] = [];
  
  resume.experience.forEach(exp => {
    const titleWords = exp.title.split(' ').filter(w => w.length > 3);
    keywords.push(...titleWords);
  });
  
  return [...new Set(keywords)].slice(0, 5);
}

function calculateExperienceYears(resume: ParsedResumeData): number {
  let totalYears = 0;
  
  resume.experience.forEach(exp => {
    const durationMatch = exp.duration.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Current)/i);
    if (durationMatch) {
      const startYear = parseInt(durationMatch[1]);
      const endYear = durationMatch[2].toLowerCase() === 'present' || durationMatch[2].toLowerCase() === 'current'
        ? new Date().getFullYear()
        : parseInt(durationMatch[2]);
      totalYears += (endYear - startYear);
    }
  });
  
  return totalYears;
}

function detectJobLevel(title: string): 'entry' | 'junior' | 'mid' | 'senior' {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('staff')) {
    return 'senior';
  }
  if (titleLower.includes('junior') || titleLower.includes('jr')) {
    return 'junior';
  }
  if (titleLower.includes('mid') || titleLower.includes('ii') || titleLower.includes('2')) {
    return 'mid';
  }
  return 'entry';
}

// Search jobs using JSearch API
export async function searchJobsWithAPI(
  query: string,
  location: string = '',
  numPages: number = 1
): Promise<JobListing[]> {
  if (!JSEARCH_API_KEY) {
    console.warn('JSearch API key not configured');
    return [];
  }

  try {
    const response = await axios.get(JSEARCH_BASE_URL, {
      params: {
        query: query,
        location: location,
        num_pages: numPages,
        page: '1'
      },
      headers: {
        'X-RapidAPI-Key': JSEARCH_API_KEY,
        'X-RapidAPI-Host': 'jsearch-proxy.p.rapidapi.com'
      }
    });
    
    return (response.data.data || []).map((job: any) => ({
      externalId: job.job_id || `job-${Date.now()}-${Math.random()}`,
      title: job.job_title || '',
      company: job.employer_name || '',
      location: job.job_city || job.job_country || 'Remote',
      type: job.job_employment_type || 'Full-time',
      salary: job.job_min_salary ? `$${job.job_min_salary} - $${job.job_max_salary}` : undefined,
      description: job.job_description || '',
      requirements: job.job_required_skills || [],
      matchScore: 0, // Will be calculated later
      source: 'JSearch API',
      url: job.job_google_link || job.job_apply_link || '',
      postedDate: job.job_posted_at_timestamp 
        ? new Date(job.job_posted_at_timestamp * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    }));
  } catch (error) {
    console.error('Error searching jobs with API:', error);
    return [];
  }
}

// Search jobs based on resume
export async function searchJobsFromResume(resume: ParsedResumeData): Promise<JobListing[]> {
  const allJobs: JobListing[] = [];
  
  // Create search queries from resume
  const searchQueries = generateSearchQueries(resume);
  
  // Search for each query
  for (const query of searchQueries.slice(0, 3)) {
    const jobs = await searchJobsWithAPI(query);
    allJobs.push(...jobs);
  }
  
  // Remove duplicates
  const uniqueJobs = removeDuplicateJobs(allJobs);
  
  // Calculate match scores using Gemini
  const matchMap = await calculateMatchScoreWithGemini(resume, uniqueJobs);
  
  // Apply match scores
  const jobsWithScores = uniqueJobs.map(job => {
    const match = matchMap.get(job.externalId);
    return {
      ...job,
      matchScore: match?.matchScore || 0,
      matchReasons: match?.reasons,
      recommendation: match?.recommendation
    };
  });
  
  // Sort by match score
  return jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
}

function generateSearchQueries(resume: ParsedResumeData): string[] {
  const queries: string[] = [];
  
  // Use top skills
  const topSkills = resume.skills.slice(0, 3);
  topSkills.forEach(skill => {
    queries.push(`${skill} developer`);
  });
  
  // Use experience titles
  resume.experience.slice(0, 2).forEach(exp => {
    queries.push(exp.title);
  });
  
  return [...new Set(queries)];
}

function removeDuplicateJobs(jobs: any[]): any[] {
  const seen = new Set();
  return jobs.filter(job => {
    const key = `${job.title}-${job.company}-${job.location}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Generate mock jobs based on resume (fallback when no API)
export function generateMockJobsFromResume(resume: ParsedResumeData): JobListing[] {
  const companies = [
    'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Stripe', 'Airbnb',
    'Uber', 'Lyft', 'Spotify', 'Twitter', 'LinkedIn', 'Salesforce', 'Adobe', 'Oracle'
  ];
  
  const locations = ['Remote', 'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX'];
  const jobTypes = ['Full-time', 'Contract', 'Part-time'];
  
  const jobs: JobListing[] = [];
  
  resume.skills.slice(0, 5).forEach((skill, index) => {
    const numJobs = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < numJobs; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const type = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      
      const experienceLevel = calculateExperienceYears(resume) >= 5 ? 'Senior' : 
                             calculateExperienceYears(resume) >= 3 ? '' : 'Junior';
      
      const title = `${experienceLevel} ${skill} ${['Developer', 'Engineer', 'Specialist'][Math.floor(Math.random() * 3)]}`.trim();
      
      const salary = `$${Math.floor(Math.random() * 100) + 100}K - $${Math.floor(Math.random() * 100) + 150}K`;
      
      jobs.push({
        externalId: `mock-${Date.now()}-${index}-${i}`,
        title,
        company,
        location,
        type,
        salary,
        description: `We are looking for a talented ${title} to join our team. You will work on cutting-edge projects using ${skill} and other modern technologies.`,
        requirements: [skill, '3+ years experience', 'Strong communication skills', 'Team player'],
        matchScore: Math.floor(Math.random() * 30) + 70,
        source: 'Mock Data',
        url: `https://example.com/jobs/${index}-${i}`,
        postedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  });
  
  return jobs;
}

// Main function to search jobs
export async function searchJobs(resume: ParsedResumeData, useAPI: boolean = false): Promise<JobListing[]> {
  if (useAPI && JSEARCH_API_KEY) {
    const apiJobs = await searchJobsFromResume(resume);
    if (apiJobs.length > 0) {
      return apiJobs;
    }
  }
  
  // Fallback to mock data
  const mockJobs = generateMockJobsFromResume(resume);
  
  // Calculate match scores using Gemini
  const matchMap = await calculateMatchScoreWithGemini(resume, mockJobs);
  
  return mockJobs.map(job => {
    const match = matchMap.get(job.externalId);
    return {
      ...job,
      matchScore: match?.matchScore || job.matchScore,
      matchReasons: match?.reasons,
      recommendation: match?.recommendation
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
