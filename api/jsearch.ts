import type { VercelRequest, VercelResponse } from '@vercel/node';

// JSearch API configuration from environment variables
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';
const JSEARCH_BASE_URL = `https://${RAPIDAPI_HOST}/search`;

// The LinkedIn card search is followed by a description fetch for the top two
// hits, so give the function room to finish instead of being cut off mid-way.
export const config = { maxDuration: 30 };

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
 * JSearch filters by ISO country code and has no "location" parameter, so the
 * city has to be written into the query while the country picks the market.
 * Without this the API happily returns US postings for an Indian search.
 */
function countryCode(location?: string): string {
  const value = (location || '').toLowerCase();
  if (!value) return 'in';
  if (
    /(india|pune|mumbai|bangalore|bengaluru|delhi|noida|gurgaon|gurugram|hyderabad|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|chandigarh|lucknow|nagpur|surat|vadodara|mysore|trivandrum|kozhikode)/.test(
      value
    )
  ) {
    return 'in';
  }
  if (/(united states|usa|u\.s\.|new york|california|texas|seattle|boston|chicago|austin|denver)/.test(value)) return 'us';
  if (/(united kingdom|uk|london|manchester|birmingham|leeds)/.test(value)) return 'gb';
  if (/(canada|toronto|vancouver|montreal)/.test(value)) return 'ca';
  if (/(australia|sydney|melbourne|brisbane)/.test(value)) return 'au';
  if (/(uae|dubai|abu dhabi|sharjah)/.test(value)) return 'ae';
  if (/singapore/.test(value)) return 'sg';
  if (/(germany|berlin|munich|hamburg)/.test(value)) return 'de';
  return 'in';
}

/** JSearch's freshness filter is `date_posted`, not `date_range`. */
function datePosted(value?: string | string[]): string {
  const raw = (typeof value === 'string' ? value : '').toLowerCase();
  if (raw === '24hours' || raw === 'day' || raw === 'today') return 'today';
  if (raw === 'week') return 'week';
  if (raw === 'month') return 'month';
  return '';
}

/**
 * A remote-only board answers "accounts executive" with "Full-Stack Developer"
 * because it matches on any word. Keep only postings whose title actually
 * shares a term with what was asked for.
 */
function matchesQueryTerms(title: string, query: string): boolean {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9+#.-]/g, ''))
    .filter((term) => term.length > 2);
  if (!terms.length) return true;
  const haystack = (title || '').toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

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
  const mapped = jobs.map((j) => ({
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
  const relevant = mapped.filter((job) => matchesQueryTerms(job.job_title, params.query));
  if (!relevant.length) throw new Error('remotive no match');
  return relevant;
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
  const mapped = jobs.map((j) => ({
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
  const relevant = mapped.filter((job) => matchesQueryTerms(job.job_title, params.query));
  if (!relevant.length) throw new Error('jobicy no match');
  return relevant;
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

// LinkedIn job connector.
//
// Uses LinkedIn's public "guest" job search endpoint, which serves the same
// cards as the logged-out jobs page and needs no account, cookie or API key.
// The cards carry no description, so the top hits get their posting page
// fetched and the real text pulled out - without it the match score has nothing
// to judge and sales postings win accounting searches on title words alone.
// Only a couple are fetched: every extra request raises the chance of being
// rate limited, and a throttle here costs the whole search its results.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

interface BoardJob {
  job_id: string;
  employer_name: string;
  job_publisher: string;
  job_title: string;
  job_description: string;
  job_apply_link: string;
  job_city?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_employment_type?: string;
}

const clean = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const grab = (card: string, pattern: RegExp) => {
  const match = card.match(pattern);
  return match ? clean(match[1]) : '';
};

// Descriptions do not change between searches, and the same posting often comes
// back under two queries, so keep what was already fetched on warm invocations.
const descriptionCache = new Map<string, string>();

/** Pull the real posting text so scoring is not done on a one-line summary. */
async function linkedinDescription(id: string): Promise<string> {
  if (!id) return '';
  const cached = descriptionCache.get(id);
  if (cached !== undefined) return cached;
  try {
    const response = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return '';
    const html = await response.text();
    const match =
      html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/) ||
      html.match(/description__text[^>]*>([\s\S]*?)<\/div>/);
    const text = clean(match?.[1] || '').slice(0, 4000);
    if (text.length > 120 && descriptionCache.size < 200) descriptionCache.set(id, text);
    return text;
  } catch {
    return '';
  }
}

/**
 * Fill in descriptions for the first couple of results, in parallel and with a
 * hard per-request cap, so one slow posting cannot stall the whole search.
 */
async function enrichLinkedInDescriptions(jobs: BoardJob[]): Promise<void> {
  const targets = jobs.slice(0, 2);
  await Promise.allSettled(
    targets.map(async (job) => {
      const id = job.job_id.replace('linkedin-', '');
      const description = await linkedinDescription(id);
      if (description.length > 120) {
        job.job_description = `${job.job_title} at ${job.employer_name} (${
          job.job_city || 'location not listed'
        }). ${description}`;
      }
    })
  );
}

async function fromLinkedIn(
  query: string,
  location = 'India',
  start = 0,
): Promise<BoardJob[]> {
  const url =
    'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search' +
    `?keywords=${encodeURIComponent(query)}` +
    `&location=${encodeURIComponent(location)}` +
    `&start=${start}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`linkedin ${response.status}`);

  const html = await response.text();
  const cards = html.split('<li').slice(1);

  const jobs: BoardJob[] = cards
    .map((card) => {
      const id =
        grab(card, /data-entity-urn="urn:li:jobPosting:(\d+)"/) ||
        grab(card, /\/jobs\/view\/(\d+)/);
      const title = grab(card, /base-search-card__title[^>]*>([\s\S]*?)<\/h3>/);
      const company = grab(card, /base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/);
      const place = grab(card, /job-search-card__location[^>]*>([\s\S]*?)<\/span>/);
      const link = grab(card, /href="(https:\/\/[^"]*linkedin\.com\/jobs\/view\/[^"]*)"/);
      const posted = grab(card, /datetime="([^"]+)"/);

      return {
        job_id: `linkedin-${id}`,
        employer_name: company || 'Unknown',
        job_publisher: 'LinkedIn',
        job_title: title,
        job_description: `${title} at ${company || 'a company'} (${place || location}). Open the posting for the full description.`,
        job_apply_link: link || (id ? `https://www.linkedin.com/jobs/view/${id}` : ''),
        job_city: place || undefined,
        job_country: location,
        job_is_remote: /remote/i.test(place),
        job_employment_type: 'Full-time',
        ...(posted ? { job_posted_at_datetime_utc: posted } : {}),
      } as BoardJob;
    })
    .filter((job) => job.job_title && job.job_id);

  if (!jobs.length) throw new Error('linkedin empty');

  await enrichLinkedInDescriptions(jobs);
  return jobs;
}


// Deep links for boards that cannot be fetched server-side.
//
// Indeed and Glassdoor both answer non-browser requests with 403 (Cloudflare /
// security pages) and Naukri's search API replies "recaptcha required". Rather
// than pretend those boards are connected, the UI links the user straight to
// the same search on each board.

interface BoardLink {
  board: string;
  url: string;
  reason: string;
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

function boardSearchLinks(query: string, location = 'India'): BoardLink[] {
  const q = encodeURIComponent(query);
  const l = encodeURIComponent(location);
  return [
    {
      board: 'Naukri',
      url: `https://www.naukri.com/${slug(query)}-jobs`,
      reason: 'search API requires a captcha',
    },
    {
      board: 'Indeed',
      url: `https://in.indeed.com/jobs?q=${q}&l=${l}`,
      reason: 'blocks automated requests (403)',
    },
    {
      board: 'Glassdoor',
      url: `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${q}`,
      reason: 'blocks automated requests (403)',
    },
    {
      board: 'Wellfound',
      url: `https://wellfound.com/jobs?query=${q}`,
      reason: 'requires a logged-in session',
    },
    {
      board: 'LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`,
      reason: 'search is fetched directly',
    },
  ];
}


async function searchJSearch(params: Params, dateRange?: string | string[]) {
  if (!RAPIDAPI_KEY) return null;
  try {
    const search = new URLSearchParams({
      // JSearch has no `location` parameter: the location belongs in the query
      // and `country` selects the market.
      query: params.location ? `${params.query} in ${params.location}` : params.query,
      page: params.page || '1',
      num_pages: params.num_pages || '1',
      country: countryCode(params.location),
      language: 'en',
    });
    const posted = datePosted(dateRange);
    if (posted) search.append('date_posted', posted);
    if (params.remote_jobs_only === 'true') search.append('remote_jobs_only', 'true');
    if (params.employment_types) search.append('employment_types', params.employment_types);
    if (params.job_required_skills) search.append('job_required_skills', params.job_required_skills);
    if (params.job_title) search.append('job_titles', params.job_title);

    const response = await fetch(`${JSEARCH_BASE_URL}?${search.toString()}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      // Surface what upstream said (host matters: a 404 here means the
      // endpoint or subscription is wrong) before falling back.
      const errorText = await response.text().catch(() => '');
      console.error('JSearch API error:', response.status, errorText, 'host:', RAPIDAPI_HOST);
      return null;
    }

    const data: any = await response.json();
    const jobs = Array.isArray(data?.data) ? data.data : [];
    if (!jobs.length) return null;
    return { jobs, request_information: data.request_information || {} };
  } catch (error: any) {
    console.error('JSearch proxy error:', error?.message || error);
    return null;
  }
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
  const primary = await searchJSearch(params, date_range);
  if (primary) {
    return res.status(200).json({
      success: true,
      data: {
        jobs: primary.jobs,
        request_information: primary.request_information,
        search_links: boardSearchLinks(params.query, params.location || 'India'),
      },
    });
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
