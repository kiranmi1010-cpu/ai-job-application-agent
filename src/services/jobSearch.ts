import { ParsedResumeData } from './gemini';
import { matchJobsWithGemini, JobMatchResult } from './gemini';
import { searchJobs as jsearchAPI, formatSalary, formatLocation, formatPostedDate, extractSkillsFromDescription, JSearchJob } from './jsearch';

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
  logo?: string;
  isRemote?: boolean;
}

/**
 * Transform JSearch API job to our JobListing format
 */
function transformJSearchJob(job: JSearchJob): JobListing {
  return {
    externalId: job.job_id || `job-${Date.now()}-${Math.random()}`,
    title: job.job_title || 'Unknown Position',
    company: job.employer_name || 'Unknown Company',
    location: formatLocation(job.job_city, job.job_state, job.job_country, job.job_is_remote),
    type: job.job_employment_type || 'Full-time',
    salary: formatSalary(job.job_min_salary, job.job_max_salary, job.job_currency),
    description: job.job_description || '',
    requirements: extractSkillsFromDescription(job.job_description || '', job.job_required_skills),
    matchScore: 0, // Will be calculated later
    source: 'JSearch',
    url: job.job_apply_link || job.job_google_link || '',
    postedDate: formatPostedDate(job.job_posted_at_timestamp, job.job_posted_at_datetime_utc),
    logo: job.employer_logo,
    isRemote: job.job_is_remote,
  };
}

/**
 * Search jobs using JSearch API with a custom query
 */
export async function searchJobsWithQuery(
  query: string,
  options: {
    location?: string;
    page?: number;
    numPages?: number;
    remoteOnly?: boolean;
    employmentTypes?: string;
    dateRange?: 'day' | 'week' | 'month' | '24hours';
  } = {}
): Promise<JobListing[]> {
  try {
    const response = await jsearchAPI({
      query,
      location: options.location,
      page: options.page,
      numPages: options.numPages,
      remoteOnly: options.remoteOnly,
      employmentTypes: options.employmentTypes,
      dateRange: options.dateRange,
    });

    if (!response.success || !response.data?.jobs) {
      console.error('JSearch API error:', response.error);
      return [];
    }

    return response.data.jobs.map(transformJSearchJob);
  } catch (error) {
    console.error('Error searching jobs:', error);
    return [];
  }
}

/**
 * Calculate match score using Gemini AI (primary) with local fallback
 */
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
  const jobLocation = (job.location || '').toLowerCase();
  if (jobLocation.includes('remote') || job.isRemote) {
    score += 10;
  }
  maxScore += 10;

  return Math.round((score / maxScore) * 100);
}

function extractSkillsFromJob(job: any): string[] {
  if (job.requirements && Array.isArray(job.requirements)) {
    return job.requirements;
  }
  
  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  
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
  
  if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('staff') || titleLower.includes('principal')) {
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

/**
 * Search jobs based on resume - uses real JSearch API
 */
export async function searchJobsFromResume(resume: ParsedResumeData): Promise<JobListing[]> {
  const allJobs: JobListing[] = [];
  
  // Create search queries from resume
  const searchQueries = generateSearchQueries(resume);
  
  // Search for each query (limit to 2 queries to stay within API limits)
  for (const query of searchQueries.slice(0, 2)) {
    const jobs = await searchJobsWithQuery(query, { numPages: 1 });
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
  
  // Use top skills with job title keywords
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

function removeDuplicateJobs(jobs: JobListing[]): JobListing[] {
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

/**
 * Main function to search jobs - always uses real JSearch API
 */
export async function searchJobs(resume: ParsedResumeData): Promise<JobListing[]> {
  return searchJobsFromResume(resume);
}
