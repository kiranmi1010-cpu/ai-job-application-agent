import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * RapidAPI / JSearch diagnostic.
 *
 * Open this URL in a browser to see exactly what the configured key answers:
 *   /api/jsearch-status
 *
 * It reports the host being called, every endpoint path that was tried, the
 * upstream HTTP status, and the first part of the upstream body. A 404 here
 * means the key is not valid for that host (usually: subscribed to a different
 * jobs API), a 403 means the plan is not active, and a 401 means a bad key.
 * It never returns jobs, so it costs at most a handful of requests.
 */

export const config = { maxDuration: 20 };

const CANDIDATE_PATHS = ['/search', '/v1/search', '/search-v2', '/jobs/search', '/api/search'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const key = process.env.RAPIDAPI_KEY || '';
  const host = (process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com').trim();
  const pathOverride = (process.env.RAPIDAPI_PATH || '').trim();

  if (!key) {
    return res.status(200).json({
      key_configured: false,
      host,
      note: 'RAPIDAPI_KEY is not visible to this deployment. Add it in Vercel for Production, then redeploy.',
      subscribe_url: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
    });
  }

  const paths = pathOverride ? [pathOverride, ...CANDIDATE_PATHS.filter((p) => p !== pathOverride)] : CANDIDATE_PATHS;
  const tried: any[] = [];

  for (const path of paths) {
    const url = `https://${host}${path}?query=accountant&page=1&num_pages=1&country=in`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': key.trim(),
          'X-RapidAPI-Host': host,
        },
        signal: AbortSignal.timeout(6000),
      });
      const body = await response.text().catch(() => '');
      const entry: any = { path, status: response.status, ok: response.ok };
      if (!response.ok) entry.upstream_message = body.slice(0, 250);
      else entry.jobs_returned = (() => {
        try {
          const parsed = JSON.parse(body);
          return Array.isArray(parsed?.data) ? parsed.data.length : null;
        } catch {
          return null;
        }
      })();
      tried.push(entry);
      if (response.ok) break;
    } catch (error: any) {
      tried.push({ path, error: error?.message || 'request failed' });
    }
  }

  const working = tried.find((entry) => entry.ok);

  return res.status(200).json({
    key_configured: true,
    key_length: key.length,
    key_had_surrounding_whitespace: key !== key.trim(),
    host,
    path_override: pathOverride || null,
    working_path: working ? working.path : null,
    verdict: working
      ? `Key works on ${host}${working.path}.`
      : 'No candidate path answered 200. Read upstream_message: 404 = key not valid for this host (subscribed to a different API), 403 = plan not active, 401 = bad key.',
    tried,
  });
}
