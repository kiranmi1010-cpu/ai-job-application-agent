import type { VercelRequest, VercelResponse } from '@vercel/node';
import { boardSearchLinks } from './board-links';

// Reports which job boards this deployment can actually reach, so the UI can
// stop implying that all of them are connected.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

type Probe = { status: number; ok: boolean; ms: number; error?: string };

async function probe(url: string, timeout = 6000): Promise<Probe> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(timeout),
    });
    return { status: response.status, ok: response.ok, ms: Date.now() - started };
  } catch (error: any) {
    return { status: 0, ok: false, ms: Date.now() - started, error: error?.message || String(error) };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const query = typeof req.query.query === 'string' ? req.query.query : 'software engineer';
  const location = typeof req.query.location === 'string' ? req.query.location : 'India';
  const q = encodeURIComponent(query);

  const [linkedin, naukri, indeed, glassdoor, wellfound] = await Promise.all([
    probe(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${q}&location=${encodeURIComponent(location)}&start=0`),
    probe(`https://www.naukri.com/jobapi/v3/search?noOfResults=5&keyword=${q}&pageNo=1`),
    probe(`https://in.indeed.com/jobs?q=${q}`),
    probe(`https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${q}`),
    probe('https://wellfound.com/jobs'),
  ]);

  return res.status(200).json({
    query,
    location,
    jsearch_key_configured: Boolean(process.env.RAPIDAPI_KEY),
    boards: {
      linkedin: { ...linkedin, fetchable: linkedin.ok, note: 'fetched directly by /api/jsearch' },
      naukri: { ...naukri, fetchable: false, note: 'search API answers 406 recaptcha required' },
      indeed: { ...indeed, fetchable: false, note: 'blocks automated requests (403)' },
      glassdoor: { ...glassdoor, fetchable: false, note: 'blocks automated requests (403)' },
      wellfound: { ...wellfound, fetchable: false, note: 'needs a logged-in session' },
    },
    links: boardSearchLinks(query, location),
  });
}
