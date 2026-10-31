import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Google retires models on short notice (2.0-flash is already gone and every
// action was 404ing). GEMINI_MODEL lets us swap on Vercel without a redeploy;
// flash-lite is the current free-tier workhorse and answers in ~1.5s, which
// matters inside a 30s function timeout.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { action, data } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    let result;

    switch (action) {
      case 'parse-resume':
        result = await parseResume(data.text);
        break;
      case 'match-jobs':
        result = await matchJobs(data.resume, data.jobs);
        break;
      case 'generate-cover-letter':
        result = await generateCoverLetter(data.resume, data.job);
        break;
      case 'generate-follow-up':
        result = await generateFollowUp(data.resume, data.job, data.daysSinceApplication);
        break;
      case 'generate-thank-you':
        result = await generateThankYou(data.resume, data.job, data.interviewerName);
        break;
      case 'analyze-job-fit':
        result = await analyzeJobFit(data.resume, data.job);
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}

// Parse resume text using Gemini
async function parseResume(text: string) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `You are an expert resume parser. Analyze the following resume text and extract structured information. Return ONLY valid JSON with this exact structure:

{
  "name": "Full name",
  "email": "email@example.com",
  "phone": "phone number",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "YYYY - YYYY or YYYY - Present",
      "description": "Brief description of responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "YYYY"
    }
  ],
  "summary": "Brief professional summary"
}

Rules:
- Extract ALL technical skills mentioned (programming languages, frameworks, tools, databases, cloud services, etc.)
- If a field cannot be found, use empty string for strings or empty array for arrays
- Keep skills as individual items (not combined phrases)
- Experience should be ordered from most recent to oldest
- Return ONLY the JSON, no markdown formatting or explanations

Resume text:
${text}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  // Clean up response - remove markdown code blocks if present
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleanedResponse);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.matches)
        ? parsed.matches
        : Array.isArray(parsed?.results)
          ? parsed.results
          : null;
    if (!list) {
      return { success: false, error: 'Gemini did not return a list of matches', raw: cleanedResponse };
    }
    return { success: true, data: list };
  } catch (e) {
    return { success: false, error: 'Failed to parse Gemini response', raw: cleanedResponse };
  }
}

// Match resume to jobs using Gemini
async function matchJobs(resume: any, jobs: any[]) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `You are an expert career advisor and job matching AI. Given a candidate's resume and a list of job openings, calculate a match score (0-100) for each job based on:
- Skills alignment (40%)
- Experience level match (25%)
- Role/title relevance (25%)
- Location/remote compatibility (10%)

Return ONLY valid JSON as an array of objects with this structure:
[
  {
    "jobId": "the job's externalId",
    "matchScore": 85,
    "reasons": ["Strong match in React and TypeScript", "Senior level aligns with 5+ years experience"],
    "missingSkills": ["Kubernetes"],
    "recommendation": "strong_apply" | "consider" | "skip"
  }
]

Candidate Resume:
Name: ${resume.name}
Skills: ${resume.skills?.join(', ')}
Experience: ${resume.experience?.map((e: any) => `${e.title} at ${e.company} (${e.duration})`).join('; ')}
Education: ${resume.education?.map((e: any) => `${e.degree} from ${e.institution}`).join('; ')}

Jobs to evaluate:
${jobs.map((j, i) => `[${i}] ID: ${j.externalId || j.id}, Title: ${j.title}, Company: ${j.company}, Location: ${j.location}, Requirements: ${j.requirements?.join(', ')}, Description: ${String(j.description || '').slice(0, 600)}`).join('\n')}

Return ONLY the JSON array, no markdown or explanations.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleanedResponse);
    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: 'Failed to parse Gemini response', raw: cleanedResponse };
  }
}

// Generate cover letter using Gemini
async function generateCoverLetter(resume: any, job: any) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `You are a professional career coach and expert at writing compelling job application emails. Write a personalized, professional cover letter email for the following application.

Candidate:
- Name: ${resume.name}
- Email: ${resume.email}
- Phone: ${resume.phone}
- Current/Most Recent Role: ${resume.experience?.[0]?.title || 'Professional'} at ${resume.experience?.[0]?.company || 'Previous Company'}
- Key Skills: ${resume.skills?.slice(0, 8).join(', ')}
- Years of Experience: Estimate from experience section
- Summary: ${resume.summary || ''}

Job:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Requirements: ${job.requirements?.join(', ')}
- Description: ${job.description || 'Not provided'}

Write a cover letter that:
1. Is professional but warm and genuine (not generic or robotic)
2. Specifically mentions how the candidate's skills match the job requirements
3. Highlights 1-2 relevant achievements from their experience
4. Shows genuine interest in the company/role
5. Is concise (3-4 paragraphs max)
6. Ends with a clear call to action

Return ONLY valid JSON:
{
  "subject": "Application for [Job Title] - [Candidate Name]",
  "body": "The full email body text"
}

No markdown, no explanations, just the JSON.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleanedResponse);
    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: 'Failed to parse Gemini response', raw: cleanedResponse };
  }
}

// Generate follow-up email
async function generateFollowUp(resume: any, job: any, daysSinceApplication: number = 7) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `Write a professional follow-up email for a job application.

Candidate: ${resume.name} (${resume.email})
Job: ${job.title} at ${job.company}
Days since application: ${daysSinceApplication}

The email should:
- Be polite and professional
- Reiterate interest in the role
- Briefly remind them of key qualifications
- Ask about application status
- Be concise (2-3 short paragraphs)

Return ONLY valid JSON:
{
  "subject": "Follow-up: Application for ${job.title} - ${resume.name}",
  "body": "The email body"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return { success: true, data: JSON.parse(cleanedResponse) };
  } catch (e) {
    return { success: false, error: 'Failed to parse response', raw: cleanedResponse };
  }
}

// Generate thank you email
async function generateThankYou(resume: any, job: any, interviewerName?: string) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `Write a professional thank you email after a job interview.

Candidate: ${resume.name} (${resume.email})
Job: ${job.title} at ${job.company}
Interviewer: ${interviewerName || 'Hiring Team'}

The email should:
- Thank them for their time
- Reference specific discussion points (use placeholders if needed)
- Reiterate enthusiasm for the role
- Be warm and professional
- Be concise (2-3 paragraphs)

Return ONLY valid JSON:
{
  "subject": "Thank You - ${job.title} Interview - ${resume.name}",
  "body": "The email body"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return { success: true, data: JSON.parse(cleanedResponse) };
  } catch (e) {
    return { success: false, error: 'Failed to parse response', raw: cleanedResponse };
  }
}

// Analyze job fit
async function analyzeJobFit(resume: any, job: any) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `You are an expert career advisor. Analyze how well this candidate fits this job and provide actionable insights.

Candidate:
- Name: ${resume.name}
- Skills: ${resume.skills?.join(', ')}
- Experience: ${resume.experience?.map((e: any) => `${e.title} at ${e.company}`).join('; ')}

Job:
- Title: ${job.title}
- Company: ${job.company}
- Requirements: ${job.requirements?.join(', ')}
- Description: ${job.description || ''}

Return ONLY valid JSON:
{
  "overallFit": "excellent" | "good" | "moderate" | "poor",
  "matchScore": 85,
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "tips": ["tip1", "tip2"],
  "shouldApply": true,
  "summary": "Brief analysis summary"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return { success: true, data: JSON.parse(cleanedResponse) };
  } catch (e) {
    return { success: false, error: 'Failed to parse response', raw: cleanedResponse };
  }
}
