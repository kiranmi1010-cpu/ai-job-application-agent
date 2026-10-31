import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fromLinkedIn } from './sources-linkedin';
import { boardSearchLinks } from './board-links';

// JSearch API configuration from environment variables
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';
const JSEARCH_BASE_URL = `https://${RAPIDAPI_HOST}/search`;

// Normalised shape the frontend expects (JSearchJob in src/services/jsearch.ts)
interface NormalizedJob {
  job_id: string;
  employer_name: string;
  employer_logo?: string;
  job_publisher: string;
  job_title: string;
  job_description: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_currency?: string;
  job_city?: string;
  job_country?: string;
  job_employment_type?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_is_remote?: boolean;
  job_posted_at_datetime_utc?: string;
}

type Params = {
  query: string;
  page?: string;
  num_pages?: string;
  remote_jobs_only?: string;
  employment_types?: string;
  location?: string;
  job_title?: string;
  company_name?: string;
  job_required_skills?: string;
};

/**
 * Free, key-less job sources used when JSearch is unavailable.
 * Each returns normalised jobs, or throws so the next source is tried.
 * Remotive and Jobicy are remote-only and support a search term;
 * Arbeitnow has no search param, so we filter its feed locally.
 */
async function fromRemotive(params: Params): Promise<NormalizedJob[]> {
  const url = new URL('https://remotive.com/api/remote-jobs');
  url.searchParams.set('search', params.query);
  url.searchParams.set('limit', '50');
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`remotive ${res.status}`);
  const body: any = await res.json();
  const jobs: any[] = Array.isArray(body?.jobs) ? body.jobs : [];
  if (!jobs.length) throw new Error('remotive empty');
  return jobs.map((j) => ({
    job_id: `remotive-${j.id}`,
    employer_name: j.company_name || 'Unknown',
    employer_logo: j.company_logo_url || j.company_logo || undefined,
    job_publisher: 'Remotive',
    job_title: j.title || '',
    job_description: j.description || '',
    job_employment_type: j.job_type || undefined,
    job_country: j.candidate_required_location || undefined,
    job_apply_link: j.url || undefined,
    job_is_remote: true,
    job_posted_at_datetime_utc: j.publication_date || undefined,
  }));
}

async function fromJobicy(params: Params): Promise<NormalizedJob[]> {
  const url = new URL('https://jobicy.com/api/v2/remote-jobs');
  url.searchParams.set('count', '50');
  if (params.query) url.searchParams.set('tag', params.query.split(/\s+/)[0]);
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`jobicy ${res.status}`);
  const body: any = await res.json();
  const jobs: any[] = Array.isArray(body?.jobs) ? body.jobs : [];
  if (!jobs.length) throw new Error('jobicy empty');
  return jobs.map((j) => ({
    job_id: `jobicy-${j.id}`,
    employer_name: j.companyName || 'Unknown',
    employer_logo: j.companyLogo || undefined,
    job_publisher: 'Jobicy',
    job_title: j.jobTitle || '',
    job_description: j.jobDescription || j.jobExcerpt || '',
    job_min_salary: j.salaryMin || undefined,
    job_max_salary: j.salaryMax || undefined,
    job_currency: j.salaryCurrency || undefined,
    job_country: j.candidateRequiredLocation || undefined,
    job_employment_type: j.jobType || undefined,
    job_apply_link: j.url || undefined,
    job_is_remote: true,
    job_posted_at_datetime_utc: j.pubDate || undefined,
  }));
}

async function fromArbeitnow(params: Params): Promise<NormalizedJob[]> {
  const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`arbeitnow ${res.status}`);
  const body: any = await res.json();
  const jobs: any[] = Array.isArray(body?.data) ? body.data : [];
  if (!jobs.length) throw new Error('arbeitnow empty');

  const terms = params.query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = jobs.filter((j) => {
    const hay = `${j.title || ''} ${j.company_name || ''} ${(j.tags || []).join(' ')}`.toLowerCase();
    return terms.length === 0 || terms.some((t) => hay.includes(t));
  });

  // Local source may not match the query - only return it if we actually found something
  const picked = matches.length ? matches : [];
  if (!picked.length) throw new Error('arbeitnow no match');
  return picked.map((j) => ({
    job_id: `arbeitnow-${j.slug}`,
    employer_name: j.company_name || 'Unknown',
    job_publisher: 'Arbeitnow',
    job_title: j.title || '',
    job_description: j.description || '',
    job_apply_link: j.url || undefined,
    job_is_remote: !!j.remote,
    job_country: j.location || undefined,
    job_employment_type: (j.job_types || []).join(', ') || undefined,
    job_posted_at_datetime_utc: j.created_at || undefined,
  }));
}

/** Try each free source in turn; returns null if all fail. */
async function freeFallback(params: Params): Promise<{ jobs: NormalizedJob[]; source: string } | null> {
  const sources: Array<[string, (p: Params) => Promise<NormalizedJob[]>]> = [
    ['LinkedIn', (p) => fromLinkedIn(p.query, p.location || 'India')],
    ['Remotive', fromRemotive],
    ['Jobicy', fromJobicy],
    ['Arbeitnow', fromArbeitnow],
  ];
  for (const [name, fn] of sources) {
    try {
      const jobs = await fn(params);
      if (jobs.length) return { jobs, source: name };
    } catch {
      // try the next source
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    query,
    page = '1',
    num_pages = '1',
    date_range,
    remote_jobs_only,
    employment_types,
    employer_names,
    job_required_skills,
    job_title,
    company_name,
    location,
  } = req.query as Record<string, string | string[] | undefined>;

  const q = typeof query === 'string' ? query : '';
  if (!q) {
    return res.status(400).json({
      error: 'Missing required parameter: query',
      message: 'Please provide a search query',
    });
  }

  const params: Params = {
    query: q,
    page: typeof page === 'string' ? page : '1',
    num_pages: typeof num_pages === 'string' ? num_pages : '1',
    remote_jobs_only: typeof remote_jobs_only === 'string' ? remote_jobs_only : undefined,
    employment_types: typeof employment_types === 'string' ? employment_types : undefined,
    location: typeof location === 'string' ? location : undefined,
    job_title: typeof job_title === 'string' ? job_title : undefined,
    company_name: typeof company_name === 'string' ? company_name : undefined,
    job_required_skills: typeof job_required_skills === 'string' ? job_required_skills : undefined,
  };

  // --- Primary: JSearch via RapidAPI (only when a key is configured) -------
  if (RAPIDAPI_KEY) {
    try {
      const search = new URLSearchParams({
        query: params.query,
        page: params.page || '1',
        num_pages: params.num_pages || '1',
      });
      if (typeof date_range === 'string' && date_range) search.append('date_range', date_range);
      if (params.remote_jobs_only === 'true') search.append('remote_jobs_only', 'true');
      if (params.employment_types) search.append('employment_types', params.employment_types);
      if (typeof employer_names === 'string' && employer_names) search.append('employer_names', employer_names);
      if (params.job_required_skills) search.append('job_required_skills', params.job_required_skills);
      if (params.job_title) search.append('job_title', params.job_title);
      if (params.company_name) search.append('company_name', params.company_name);
      if (params.location) search.append('location', params.location);

      const response = await fetch(`${JSEARCH_BASE_URL}?${search.toString()}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data: any = await response.json();
        const jobs = Array.isArray(data?.data) ? data.data : [];
        if (jobs.length) {
          return res.status(200).json({
            success: true,
            data: { jobs, request_information: data.request_information || {}, search_links: boardSearchLinks(params.query, params.location || 'India') },
          });
        }
      } else {
        // Surface what upstream said (host matters: a 404 here means the
        // endpoint or subscription is wrong) before falling back.
        const errorText = await response.text().catch(() => '');
        console.error('JSearch API error:', response.status, errorText, 'host:', RAPIDAPI_HOST);
      }
    } catch (error: any) {
      console.error('JSearch proxy error:', error?.message || error);
    }
  }

  // --- Fallback: free key-less sources so search never dead-ends ------------
  const fallback = await freeFallback(params);
  if (fallback) {
    return res.status(200).json({
      success: true,
      data: {
        jobs: fallback.jobs,
        request_information: { status: 'fallback', source: fallback.source },
        search_links: boardSearchLinks(params.query, params.location || 'India'),
      },
      ...(RAPIDAPI_KEY ? {} : { notice: 'RAPIDAPI_KEY not set - using free sources' }),
    });
  }

  return res.status(502).json({
    error: 'No job sources available',
    message: 'JSearch failed and free sources returned no results.',
    host: RAPIDAPI_HOST,
    jsearch_key_configured: Boolean(RAPIDAPI_KEY),
  });
}
