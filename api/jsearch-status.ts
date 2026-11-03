import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * RapidAPI / JSearch diagnostic.
 *
 * Open this URL in a browser to see exactly what the configured key answers:
 *   /api/jsearch-status
 *
 * It reports the host being called, every endpoint path that was tried, the
 * upstream HTTP status, how long it took, the top-level keys of a successful
 * body and how many jobs could be found in it. That distinguishes the three
 * real failure modes: a retired path (404), an inactive plan (403), a bad key
 * (401), or simply a slow endpoint (timeout).
 */

export const config = { maxDuration: 60 };

const CANDIDATE_PATHS = ['/search-v2', '/search', '/v1/search', '/jobs/search', '/api/search'];
const TIMEOUT_MS = 15000;

/** Read the job array wherever the API happens to put it. */
function extractJobArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.jobs)) return data.data.jobs;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  return [];
}

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
    const startedAt = Date.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': key.trim(),
          'X-RapidAPI-Host': host,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const body = await response.text().catch(() => '');
      const elapsed_ms = Date.now() - startedAt;
      const entry: any = { path, status: response.status, ok: response.ok, elapsed_ms };

      if (!response.ok) {
        entry.upstream_message = body.slice(0, 250);
      } else {
        try {
          const parsed = JSON.parse(body);
          entry.top_level_keys = parsed && typeof parsed === 'object' ? Object.keys(parsed) : [];
          entry.jobs_found = extractJobArray(parsed).length;
          entry.body_bytes = body.length;
        } catch {
          entry.parse_error = true;
          entry.sample = body.slice(0, 200);
        }
      }

      tried.push(entry);
      if (response.ok) break;
    } catch (error: any) {
      tried.push({ path, error: error?.message || 'request failed', elapsed_ms: Date.now() - startedAt });
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
      ? `Key works on ${host}${working.path} in ${working.elapsed_ms}ms with ${working.jobs_found ?? 0} jobs.`
      : 'No candidate path answered 200. Read upstream_message (404 = retired path, 403 = plan inactive, 401 = bad key) and any timeout entries.',
    tried,
  });
}
