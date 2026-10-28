import type { VercelRequest, VercelResponse } from '@vercel/node';

// JSearch API configuration from environment variables
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';
const JSEARCH_BASE_URL = `https://${RAPIDAPI_HOST}/search`;

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

  // Check API credentials
  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ 
      error: 'RAPIDAPI_KEY not configured',
      message: 'Please set RAPIDAPI_KEY environment variable in Vercel'
    });
  }

  try {
    // Extract query parameters
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
    } = req.query;

    // Validate required query parameter
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Missing required parameter: query',
        message: 'Please provide a search query'
      });
    }

    // Build query parameters for JSearch API
    const params = new URLSearchParams({
      query: query,
      page: String(page),
      num_pages: String(num_pages),
    });

    // Add optional parameters if provided
    if (date_range && typeof date_range === 'string') {
      params.append('date_range', date_range);
    }
    if (remote_jobs_only === 'true') {
      params.append('remote_jobs_only', 'true');
    }
    if (employment_types && typeof employment_types === 'string') {
      params.append('employment_types', employment_types);
    }
    if (employer_names && typeof employer_names === 'string') {
      params.append('employer_names', employer_names);
    }
    if (job_required_skills && typeof job_required_skills === 'string') {
      params.append('job_required_skills', job_required_skills);
    }
    if (job_title && typeof job_title === 'string') {
      params.append('job_title', job_title);
    }
    if (company_name && typeof company_name === 'string') {
      params.append('company_name', company_name);
    }
    if (location && typeof location === 'string') {
      params.append('location', location);
    }

    // Make request to JSearch API
    const response = await fetch(`${JSEARCH_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('JSearch API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'JSearch API request failed',
        status: response.status,
        message: errorText
      });
    }

    // Parse response
    const data = await response.json();

    // Transform and return data
    return res.status(200).json({
      success: true,
       data: {
        jobs: data.data || [],
        request_information: data.request_information || {},
      }
    });

  } catch (error: any) {
    console.error('JSearch proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch jobs from JSearch API',
      message: error.message || 'Unknown error'
    });
  }
}
