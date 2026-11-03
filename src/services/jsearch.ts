// JSearch API client service
// This service calls the Vercel serverless function that proxies JSearch API requests

export interface JSearchJob {
  job_id: string;
  employer_name: string;
  employer_logo?: string;
  employer_website?: string;
  job_publisher: string;
  job_title: string;
  job_description: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_currency?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_employment_type?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_is_remote?: boolean;
  job_posted_at_timestamp?: number;
  job_posted_at_datetime_utc?: string;
  job_required_skills?: string[];
  job_benefits?: string[];
}

export interface JSearchResponse {
  success: boolean;
  data: {
    jobs: JSearchJob[];
    request_information?: {
      status?: string;
      request_id?: string;
    };
  };
  error?: string;
  message?: string;
}

export interface SearchParams {
  query: string;
  page?: number;
  numPages?: number;
  dateRange?: 'day' | 'week' | 'month' | '24hours';
  remoteOnly?: boolean;
  employmentTypes?: string; // comma-separated: FULLTIME,PARTTIME,CONTRACTOR,INTERN
  employerNames?: string; // comma-separated
  jobRequiredSkills?: string; // comma-separated
  jobTitle?: string;
  companyName?: string;
  location?: string;
}

/**
 * Search for jobs using JSearch API via Vercel serverless proxy
 */
export async function searchJobs(params: SearchParams): Promise<JSearchResponse> {
  try {
    // Build query string
    const queryParams = new URLSearchParams({
      query: params.query,
      page: String(params.page || 1),
      num_pages: String(params.numPages || 1),
    });

    if (params.dateRange) {
      queryParams.append('date_range', params.dateRange);
    }
    if (params.remoteOnly) {
      queryParams.append('remote_jobs_only', 'true');
    }
    if (params.employmentTypes) {
      queryParams.append('employment_types', params.employmentTypes);
    }
    if (params.employerNames) {
      queryParams.append('employer_names', params.employerNames);
    }
    if (params.jobRequiredSkills) {
      queryParams.append('job_required_skills', params.jobRequiredSkills);
    }
    if (params.jobTitle) {
      queryParams.append('job_title', params.jobTitle);
    }
    if (params.companyName) {
      queryParams.append('company_name', params.companyName);
    }
    if (params.location) {
      queryParams.append('location', params.location);
    }

    // Call the Vercel serverless function
    const response = await fetch(`/api/jsearch?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: JSearchResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching jobs:', error);
    return {
      success: false,
      data: { jobs: [] },
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Format salary range for display
 */
export function formatSalary(min?: number, max?: number, currency?: string): string {
  if (!min && !max) return 'Not specified';

  const symbols: Record<string, string> = { USD: '$', INR: '\u20b9', EUR: '\u20ac', GBP: '\u00a3', AED: 'AED ', SGD: 'S$', CAD: 'C$', AUD: 'A$' };
  const code = String(currency || '').toUpperCase();
  const currencySymbol = symbols[code] ?? (code ? code + ' ' : '$');

  if (min && max) {
    return `${currencySymbol}${(min / 1000).toFixed(0)}K - ${currencySymbol}${(max / 1000).toFixed(0)}K`;
  } else if (min) {
    return `From ${currencySymbol}${(min / 1000).toFixed(0)}K`;
  } else if (max) {
    return `Up to ${currencySymbol}${(max / 1000).toFixed(0)}K`;
  }
  return 'Not specified';
}

/**
 * Format location for display
 */
export function formatLocation(city?: string, state?: string, country?: string, isRemote?: boolean): string {
  if (isRemote) return 'Remote';
  const parts = [];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (country) parts.push(country);
  return parts.length > 0 ? parts.join(', ') : 'Location not specified';
}

/**
 * Format posted date for display
 */
export function formatPostedDate(timestamp?: number, datetimeUtc?: string): string {
  if (!timestamp && !datetimeUtc) return 'Recently';

  let date: Date;
  if (timestamp) {
    date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  } else if (datetimeUtc) {
    date = new Date(datetimeUtc);
  } else {
    return 'Recently';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Skills worth showing as chips. Kept technology-flavoured on purpose: these are
 * extracted from the posting text, and a posting that mentions "digital" or
 * "interest" is not asking for Git or REST, so matching is word-bounded.
 */
const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java',
  'C++', 'C#', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'HTML', 'CSS',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'GCP',
  'Docker', 'Kubernetes', 'Git', 'CI/CD', 'REST', 'GraphQL', 'Agile', 'Scrum'
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extract skills from a job description when the board did not supply them.
 *
 * A plain `includes` check tagged every posting that mentioned "digital" with
 * Git and every posting that mentioned "interest" with REST, which showed up as
 * nonsense requirements on marketing jobs. Matching now requires the skill to
 * be its own token, and very short skills are matched case-sensitively so the
 * English word "go" is not read as the language Go.
 */
export function extractSkillsFromDescription(description: string, requiredSkills?: string[]): string[] {
  if (requiredSkills && requiredSkills.length > 0) {
    return requiredSkills;
  }

  const text = String(description || '');
  if (!text.trim()) return [];

  const foundSkills: string[] = [];
  for (const skill of COMMON_SKILLS) {
    const short = skill.length <= 3;
    const haystack = short ? text : text.toLowerCase();
    const needle = short ? skill : skill.toLowerCase();
    const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(needle)}([^a-z0-9+#]|$)`, short ? '' : 'i');
    if (pattern.test(haystack)) {
      foundSkills.push(skill);
    }
  }
  return foundSkills.slice(0, 10);
}
