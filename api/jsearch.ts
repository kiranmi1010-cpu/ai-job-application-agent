import type { VercelRequest, VercelResponse } from '@vercel/node';

// JSearch API configuration from environment variables
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = (process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com').trim();

// JSearch moved search to `/search-v2`; the old `/search` now answers
// 404 "Endpoint does not exist". The working path is remembered per warm
// instance, and RAPIDAPI_PATH overrides it without a code change.
const CONFIGURED_PATH = (process.env.RAPIDAPI_PATH || '').trim();
const PATH_CANDIDATES = ['/search-v2', '/search', '/v1/search', '/jobs/search'];
let workingPath: string | null = CONFIGURED_PATH || null;

function pathsToTry(): string[] {
  const ordered = workingPath ? [workingPath, ...PATH_CANDIDATES.filter((p) => p !== workingPath)] : PATH_CANDIDATES;
  return ordered;
}

// Every search is for this city unless the candidate overrides it in Settings,
// and remote roles are always included alongside the local ones.
const DEFAULT_LOCATION = 'Bangalore';
const MAX_REMOTE_JOBS = 8;

// The LinkedIn card search can be retried once and is followed by a description
// fetch, so give the function room to finish instead of being cut off mid-way.
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
 * "India" is not a city and an empty value means "wherever", so both resolve to
 * the default city. Remote roles are added separately, not by widening the city.
 */
function resolveLocation(location?: string): string {
  const value = (location || '').trim();
  if (!value) return DEFAULT_LOCATION;
  if (/^(india|in|anywhere|any)$/i.test(value)) return DEFAULT_LOCATION;
  return value;
}

/**
 * JSearch filters by ISO country code and has no "location" parameter, so the
 * city has to be written into the query while the country picks the market.
 * Without this the API happily returns US postings for an Indian search.
 */
function countryCode(location?: string): string {
  const value = (location || '').toLowerCase();
  if (!value) return 'in';
  if (
    /(india|bangalore|bengaluru|pune|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|chandigarh|lucknow|nagpur|surat|vadodara|mysore|trivandrum|kozhikode)/.test(
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
 * Boards match loosely - "accounts" alone will happily return "Engineering
 * Manager - Bank Accounts". Require every word of the query in the title so an
 * unrelated posting cannot slip through.
 */
function matchesQueryTerms(title: string, query: string): boolean {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9+#.-]/g, ''))
    .filter((term) => term.length > 2);
  if (!terms.length) return true;
  const haystack = (title || '').toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

const stripHtml = (value: string) => {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Remote job sources. Remotive and Jobicy are remote-only and support a search
 * term; Arbeitnow carries a remote flag but needs local filtering.
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
    job_description: stripHtml(j.description || ''),
    job_employment_type: j.job_type || undefined,
    job_city: 'Remote',
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
    job_description: stripHtml(j.jobDescription || j.jobExcerpt || ''),
    job_min_salary: j.salaryMin || undefined,
    job_max_salary: j.salaryMax || undefined,
    job_currency: j.salaryCurrency || undefined,
    job_city: 'Remote',
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

  const picked = matches.filter((j) => j.remote);
  if (!picked.length) throw new Error('arbeitnow no remote match');
  return picked.map((j) => ({
    job_id: `arbeitnow-${j.slug}`,
    employer_name: j.company_name || 'Unknown',
    job_publisher: 'Arbeitnow',
    job_title: j.title || '',
    job_description: stripHtml(j.description || ''),
    job_apply_link: j.url || undefined,
    job_is_remote: true,
    job_city: 'Remote',
    job_country: j.location || undefined,
    job_employment_type: (j.job_types || []).join(', ') || undefined,
    job_posted_at_datetime_utc: j.created_at || undefined,
  }));
}

/** Remote roles are wanted in every search, so this runs beside the city feed. */
async function collectRemoteJobs(params: Params): Promise<NormalizedJob[]> {
  const settled = await Promise.allSettled([fromRemotive(params), fromJobicy(params), fromArbeitnow(params)]);
  const jobs: NormalizedJob[] = [];
  settled.forEach((result) => {
    if (result.status === 'fulfilled') jobs.push(...result.value);
  });
  return jobs.slice(0, MAX_REMOTE_JOBS);
}

/** City results first, then remote roles, without repeating a posting. */
function mergeJobs(local: any[], remote: NormalizedJob[]): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];
  [...local, ...remote].forEach((job) => {
    const key = `${String(job.job_title || '').toLowerCase()}|${String(job.employer_name || '').toLowerCase()}`;
    if (!key.trim() || key === '|' || seen.has(key)) return;
    seen.add(key);
    merged.push(job);
  });
  return merged;
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

const clean = (value: string) => stripHtml(value);

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

/** LinkedIn writes the city into the card, so its spelling varies a lot. */
function isInCity(place: string | undefined, city: string): boolean {
  const hay = `${place || ''}`.toLowerCase();
  if (!hay) return false;
  if (/bangalore|bengaluru/i.test(city)) return /bangalore|bengaluru/i.test(hay);
  const token = city.toLowerCase().split(/[\s,]+/)[0];
  return token.length > 2 && hay.includes(token);
}

async function fromLinkedIn(
  query: string,
  location = DEFAULT_LOCATION,
  start = 0,
): Promise<BoardJob[]> {
  const url =
    'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search' +
    `?keywords=${encodeURIComponent(query)}` +
    `&location=${encodeURIComponent(location)}` +
    `&start=${start}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(7000),
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
      const remote = /remote|work from home|anywhere/i.test(`${place} ${title}`);

      return {
        job_id: `linkedin-${id}`,
        employer_name: company || 'Unknown',
        job_publisher: 'LinkedIn',
        job_title: title,
        job_description: `${title} at ${company || 'a company'} (${place || location}). Open the posting for the full description.`,
        job_apply_link: link || (id ? `https://www.linkedin.com/jobs/view/${id}` : ''),
        job_city: place || undefined,
        job_country: location,
        job_is_remote: remote,
        job_employment_type: 'Full-time',
        ...(posted ? { job_posted_at_datetime_utc: posted } : {}),
      } as BoardJob;
    })
    .filter((job) => job.job_title && job.job_id);

  if (!jobs.length) throw new Error('linkedin empty');

  const wanted = jobs.filter((job) => job.job_is_remote || isInCity(job.job_city, location));
  const chosen = wanted.length >= 3 ? wanted : jobs;

  await enrichLinkedInDescriptions(chosen);
  return chosen;
}

/** LinkedIn throttles bursts, so one retry rides out a transient refusal. */
async function fromLinkedInWithRetry(query: string, location: string): Promise<BoardJob[]> {
  try {
    return await fromLinkedIn(query, location);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return fromLinkedIn(query, location);
  }
}

/** City feed plus remote roles, run together; returns null if both are empty. */
async function freeFallback(
  params: Params
): Promise<{ jobs: NormalizedJob[]; source: string } | null> {
  const location = resolveLocation(params.location);
  const [cityResult, remoteJobs] = await Promise.all([
    fromLinkedInWithRetry(params.query, location)
      .then((jobs) => ({ ok: true, jobs: jobs as any[] }))
      .catch(() => ({ ok: false, jobs: [] as any[] })),
    collectRemoteJobs(params).catch(() => [] as NormalizedJob[]),
  ]);

  if (!cityResult.ok && remoteJobs.length === 0) return null;

  const merged = mergeJobs(cityResult.jobs, remoteJobs);
  if (!merged.length) return null;

  const source =
    cityResult.ok && remoteJobs.length > 0
      ? `LinkedIn (${location}) + remote boards`
      : cityResult.ok
        ? `LinkedIn (${location})`
        : 'remote boards';

  return { jobs: merged, source };
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

function boardSearchLinks(query: string, location = DEFAULT_LOCATION): BoardLink[] {
  const q = encodeURIComponent(query);
  const l = encodeURIComponent(location);
  return [
    {
      board: 'Naukri',
      url: `https://www.naukri.com/${slug(query)}-jobs-in-${slug(location)}`,
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
      board: 'LinkedIn remote',
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}&f_WT=2`,
      reason: 'remote filter on LinkedIn',
    },
  ];
}


/**
 * The upstream reason a JSearch call failed is returned rather than only
 * logged, because Vercel's logs are not reachable from the app: without this a
 * misconfigured key looks exactly like a key that was never set.
 */
type JSearchResult =
  | { ok: true; jobs: NormalizedJob[]; request_information: any; path: string }
  | { ok: false; error: string; path?: string };

/** `/search-v2` may nest or rename fields, so read the array wherever it is. */
function extractJobArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.jobs)) return data.data.jobs;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/** Accept v1 and v2 field names so the client always gets the same shape. */
function normalizeJSearchJob(raw: any): NormalizedJob {
  return {
    job_id: String(
      raw?.job_id ?? raw?.job_uid ?? raw?.id ?? raw?.uid ?? `jsearch-${Math.random().toString(36).slice(2, 10)}`
    ),
    employer_name: raw?.employer_name ?? raw?.company ?? raw?.company_name ?? 'Unknown',
    employer_logo: raw?.employer_logo ?? raw?.company_logo ?? undefined,
    job_publisher: raw?.job_publisher ?? raw?.publisher ?? 'JSearch',
    job_title: raw?.job_title ?? raw?.title ?? raw?.position ?? 'Unknown Position',
    job_description: String(raw?.job_description ?? raw?.description ?? ''),
    job_min_salary: raw?.job_min_salary ?? undefined,
    job_max_salary: raw?.job_max_salary ?? undefined,
    job_currency: raw?.job_currency ?? undefined,
    job_city: raw?.job_city ?? raw?.job_location ?? raw?.location ?? undefined,
    job_country: raw?.job_country ?? undefined,
    job_employment_type: raw?.job_employment_type ?? raw?.employment_type ?? undefined,
    job_apply_link: raw?.job_apply_link ?? raw?.url ?? raw?.apply_link ?? undefined,
    job_google_link: raw?.job_google_link ?? undefined,
    job_is_remote: Boolean(raw?.job_is_remote ?? raw?.is_remote ?? false),
    job_posted_at_datetime_utc:
      raw?.job_posted_at_datetime_utc ?? raw?.job_posted_at ?? raw?.posted_at ?? undefined,
  };
}

async function searchJSearch(params: Params, dateRange?: string | string[]): Promise<JSearchResult> {
  if (!RAPIDAPI_KEY) return { ok: false, error: 'RAPIDAPI_KEY is not set in this environment' };
  const location = resolveLocation(params.location);
  let lastError = '';
  let lastPath = '';

  for (const path of pathsToTry()) {
    lastPath = path;
    try {
      const search = new URLSearchParams({
        // JSearch has no `location` parameter: the location belongs in the query
        // and `country` selects the market.
        query: `${params.query} in ${location}`,
        page: params.page || '1',
        num_pages: params.num_pages || '1',
        country: countryCode(location),
        language: 'en',
      });
      const posted = datePosted(dateRange);
      if (posted) search.append('date_posted', posted);
      if (params.remote_jobs_only === 'true') search.append('remote_jobs_only', 'true');
      if (params.employment_types) search.append('employment_types', params.employment_types);

      const response = await fetch(`https://${RAPIDAPI_HOST}${path}?${search.toString()}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY.trim(),
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.status === 404) {
        lastError = `HTTP 404 at ${path}: endpoint not available on ${RAPIDAPI_HOST}`;
        continue; // try the next known path
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('JSearch API error:', response.status, errorText, 'path:', path);
        lastError = `HTTP ${response.status} from ${RAPIDAPI_HOST}${path}: ${errorText.slice(0, 250) || 'no body'}`;
        break;
      }

      const data: any = await response.json();
      const jobs = extractJobArray(data).map(normalizeJSearchJob);
      if (!jobs.length) {
        lastError = `JSearch returned 0 jobs (path ${path}, country ${countryCode(location)})`;
        break;
      }

      workingPath = path;
      return { ok: true, jobs, request_information: data?.request_information || {}, path };
    } catch (error: any) {
      lastError = `Request failed on ${path}: ${error?.message || 'unknown error'}`;
    }
  }

  return { ok: false, error: lastError || 'JSearch request failed', path: lastPath };
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

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    location: typeof location === 'string' ? location : DEFAULT_LOCATION,
    job_title: typeof job_title === 'string' ? job_title : undefined,
    company_name: typeof company_name === 'string' ? company_name : undefined,
    job_required_skills: typeof job_required_skills === 'string' ? job_required_skills : undefined,
  };

  const searchLocation = resolveLocation(params.location);

  // --- Primary: JSearch via RapidAPI (only when a key is configured) -------
  const primary = await searchJSearch(params, date_range);
  if (primary.ok) {
    return res.status(200).json({
      success: true,
      data: {
        jobs: primary.jobs,
        request_information: primary.request_information,
        location: searchLocation,
        source: `JSearch (${primary.path})`,
        search_links: boardSearchLinks(params.query, searchLocation),
      },
    });
  }

  // --- Fallback: city feed plus remote roles so search never dead-ends -------
  const fallback = await freeFallback(params);
  if (fallback) {
    return res.status(200).json({
      success: true,
      data: {
        jobs: fallback.jobs,
        request_information: { status: 'fallback', source: fallback.source },
        location: searchLocation,
        search_links: boardSearchLinks(params.query, searchLocation),
      },
      jsearch_error: primary.error,
    });
  }

  return res.status(502).json({
    error: 'No job sources available',
    message: 'JSearch failed and free sources returned no results.',
    host: RAPIDAPI_HOST,
    jsearch_key_configured: Boolean(RAPIDAPI_KEY),
    jsearch_error: primary.error,
  });
}
