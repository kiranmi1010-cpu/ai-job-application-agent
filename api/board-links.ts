// Deep links for boards that cannot be fetched server-side.
//
// Indeed and Glassdoor both answer non-browser requests with 403 (Cloudflare /
// security pages) and Naukri's search API replies "recaptcha required". Rather
// than pretend those boards are connected, the UI links the user straight to
// the same search on each board.

export interface BoardLink {
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

export function boardSearchLinks(query: string, location = 'India'): BoardLink[] {
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
