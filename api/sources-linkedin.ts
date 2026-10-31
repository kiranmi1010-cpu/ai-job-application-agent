// LinkedIn job connector.
//
// Uses LinkedIn's public "guest" job search endpoint, which serves the same
// cards as the logged-out jobs page and needs no account, cookie or API key.
// It returns no description text, so the description field explains that the
// posting itself must be opened for the full text.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export interface BoardJob {
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

export async function fromLinkedIn(
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
  return jobs;
}
