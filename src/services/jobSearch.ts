import { ParsedResumeData } from './gemini';
import { matchJobsWithGemini, JobMatchResult } from './gemini';
import { searchJobs as jsearchAPI, formatSalary, formatLocation, formatPostedDate, extractSkillsFromDescription, JSearchJob } from './jsearch';

export interface SearchTargets {
  /** Roles the candidate actually wants; wins over anything inferred from the resume. */
  roles?: string[];
  location?: string;
}

/** "Accounts Manager, Sales Executive" -> ["Accounts Manager", "Sales Executive"] */
export function parseRoleList(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split(/[,;\n|]/)
    .map((role) => role.replace(/\s+/g, ' ').trim())
    .filter((role) => role.length >= 2)
    .slice(0, 5);
}

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
  const keyOf = (job: any, index: number) =>
    String(job?.externalId ?? job?.id ?? job?.job_id ?? 'job-' + index);

  const localResult = (job: any, index: number): JobMatchResult => {
    const score = calculateMatchScoreLocal(resume, job);
    return {
      jobId: keyOf(job, index),
      matchScore: score,
      reasons: score > 0 ? ['Scored locally from the skills, title and seniority in your resume'] : [],
      missingSkills: [],
      recommendation: score >= 85 ? 'strong_apply' : score >= 70 ? 'consider' : 'skip',
    };
  };

  try {
    const sent = jobs.map((job, index) => ({
      ...job,
      jobId: keyOf(job, index),
      description: String(job.description || '').slice(0, 1200),
    }));
    const result = await matchJobsWithGemini(resume, sent);

    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      const known = new Set(jobs.map((job, index) => keyOf(job, index)));
      const byId = new Map<string, JobMatchResult>();
      const unresolved: JobMatchResult[] = [];

      result.data.forEach((raw: any, index: number) => {
        const id = String(raw?.jobId ?? raw?.job_id ?? raw?.id ?? '');
        const numeric = Number(raw?.matchScore ?? raw?.score);
        const score = Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : 0;
        const entry: JobMatchResult = {
          jobId: id || 'job-' + index,
          matchScore: score,
          reasons: Array.isArray(raw?.reasons) ? raw.reasons : [],
          missingSkills: Array.isArray(raw?.missingSkills) ? raw.missingSkills : [],
          recommendation:
            raw?.recommendation === 'strong_apply' || raw?.recommendation === 'consider' || raw?.recommendation === 'skip'
              ? raw.recommendation
              : score >= 85 ? 'strong_apply' : score >= 70 ? 'consider' : 'skip',
        };
        if (id && known.has(id)) byId.set(id, entry);
        else unresolved.push(entry);
      });

      // If the model dropped or invented ids, fall back to positional order.
      let cursor = 0;
      jobs.forEach((job, index) => {
        const key = keyOf(job, index);
        if (byId.has(key)) return;
        const fallback = unresolved[cursor++];
        if (fallback) byId.set(key, { ...fallback, jobId: key });
      });

      jobs.forEach((job, index) => {
        const key = keyOf(job, index);
        const match = byId.get(key);
        matchMap.set(key, match && match.matchScore > 0 ? match : localResult(job, index));
      });
      return matchMap;
    }
  } catch (error) {
    console.warn('Gemini job matching failed, using local fallback:', error);
  }

  jobs.forEach((job, index) => matchMap.set(keyOf(job, index), localResult(job, index)));
  return matchMap;
}

// Local fallback match score calculator
function calculateMatchScoreLocal(resume: ParsedResumeData, job: any): number {
  let score = 0;
  let maxScore = 0;

  // Skills match (40% weight). Score the candidate's own skills against the
  // posting text instead of a hardcoded tech vocabulary, so a finance, design
  // or sales resume is judged on its real field.
  const jobText = [
    job.title || '',
    job.description || '',
    Array.isArray(job.requirements) ? job.requirements.join(' ') : '',
  ].join(' ').toLowerCase();

  const skills = (resume.skills || []).map((skill) => String(skill || '').trim()).filter(Boolean);
  const matchedSkills = skills.filter((skill) => jobText.includes(skill.toLowerCase()));

  if (skills.length > 0) {
    score += Math.min(1, matchedSkills.length / Math.min(skills.length, 6)) * 40;
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
export async function searchJobsFromResume(resume: ParsedResumeData, targets?: SearchTargets): Promise<JobListing[]> {
  const allJobs: JobListing[] = [];
  
  // Create search queries from resume
  const searchQueries = generateSearchQueries(resume, targets);
  
  // Search for each query (limit to 2 queries to stay within API limits)
  for (const query of searchQueries.slice(0, 2)) {
    const jobs = await searchJobsWithQuery(query, { numPages: 1, location: targets?.location || undefined });
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

export function generateSearchQueries(resume: ParsedResumeData, targets?: SearchTargets): string[] {
  const queries: string[] = [];
  const roles = (targets?.roles || []).map((role) => String(role || '').trim()).filter(Boolean);

  // What the candidate says they want always beats what the resume implies.
  queries.push(...roles);

  if (roles.length === 0) {
    (resume.experience || []).slice(0, 3).forEach((exp) => {
      if (exp?.title?.trim()) queries.push(exp.title.trim());
    });
  }

  // Bare skills, with no job family appended: "Tally" is as valid a search in
  // accounting as "React" is in engineering.
  (resume.skills || []).slice(0, 4).forEach((skill) => {
    if (skill?.trim()) queries.push(skill.trim());
  });

  const cleaned = queries.map((query) => query.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return [...new Set(cleaned)];
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
export async function searchJobs(resume: ParsedResumeData, targets?: SearchTargets): Promise<JobListing[]> {
  return searchJobsFromResume(resume, targets);
}
