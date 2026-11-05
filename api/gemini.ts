import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Google retires models on short notice (2.0-flash is already gone and every
// action was 404ing). GEMINI_MODEL lets us swap on Vercel without a redeploy;
// flash-lite is the current free-tier workhorse and answers in ~1.5s, which
// matters inside a 30s function timeout.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

// OmniRoute (or any OpenAI-compatible gateway: OpenRouter, LiteLLM, OmniRoute)
// pools several provider keys behind one endpoint, which is how the assistant
// gets a bigger token budget. Set OMNIROUTE_BASE_URL to switch every action
// over to it; Gemini stays as the fallback if the gateway is down.
const OMNIROUTE_BASE_URL = (process.env.OMNIROUTE_BASE_URL || '').replace(/\/$/, '');
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY || '';
const OMNIROUTE_MODEL = process.env.OMNIROUTE_MODEL || 'gemini-2.0-flash';

function activeProvider(): 'omniroute' | 'gemini' | 'none' {
  if (OMNIROUTE_BASE_URL) return 'omniroute';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'none';
}

/**
 * One OpenAI-compatible chat call. Works with OmniRoute's `/v1` endpoint, so any
 * router the candidate hosts (localhost, a tunnel, or Render) can serve it.
 */
async function callOmniRoute(prompt: string): Promise<string> {
  const response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(OMNIROUTE_API_KEY ? { Authorization: `Bearer ${OMNIROUTE_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: OMNIROUTE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OmniRoute HTTP ${response.status}: ${body.slice(0, 200) || 'no body'}`);
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OmniRoute returned no content');
  return String(content);
}

/**
 * Every action is "prompt in, JSON text out", so it all goes through here and
 * the provider becomes a deployment concern rather than a code path.
 */
async function generateText(prompt: string): Promise<{ text: string; provider: string }> {
  if (OMNIROUTE_BASE_URL) {
    try {
      return { text: await callOmniRoute(prompt), provider: 'omniroute' };
    } catch (error: any) {
      console.error('OmniRoute failed, falling back to Gemini:', error?.message || error);
    }
  }

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  return { text: result.response.text(), provider: 'gemini' };
}

const stripFences = (value: string) => value.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

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

  // A read-only status probe, so the provider can be checked from a browser
  // without spending a token.
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: activeProvider() !== 'none',
      provider: activeProvider(),
      model: activeProvider() === 'omniroute' ? OMNIROUTE_MODEL : MODEL,
      omniroute_configured: Boolean(OMNIROUTE_BASE_URL),
      gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Either provider is enough: a self-hosted router needs no Gemini key.
  if (activeProvider() === 'none') {
    return res.status(500).json({ error: 'No AI provider configured: set GEMINI_API_KEY or OMNIROUTE_BASE_URL' });
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
      case 'polish-answer':
        result = await polishAnswer(data.question || '', data.draft || '', data.profile || {});
        break;
      case 'answer-questions':
        result = await answerQuestions(data.profile || {}, data.questions || [], data.job || {});
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('AI provider error:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: error.message,
    });
  }
}

// Parse resume text using the configured provider
async function parseResume(text: string) {
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
- Extract the skills, tools and domain competencies the candidate actually has, in their own field and wording. Any field counts: accounting (Tally, GST, TDS, reconciliation), sales (B2B, lead generation, CRM), HR (recruitment, onboarding), healthcare (patient care), teaching (lesson planning), operations, design, engineering, and software too. Never convert a non-technical resume into programming skills it does not contain.
- If a field cannot be found, use empty string for strings or empty array for arrays
- Keep skills as individual items (not combined phrases)
- Experience should be ordered from most recent to oldest
- Return ONLY the JSON, no markdown formatting or explanations

Resume text:
${text}`;

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);

  try {
    const parsed = JSON.parse(cleaned);
    // This action returns a single object; the list checks that used to live
    // here belonged to match-jobs and made every resume parse look like a
    // failure, so uploads silently fell back to the offline parser.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'Resume parser did not return an object', raw: cleaned, provider };
    }
    return { success: true, data: parsed, provider };
  } catch (e) {
    return { success: false, error: 'Failed to parse AI response', raw: cleaned, provider };
  }
}

// Match resume to jobs using the configured provider
async function matchJobs(resume: any, jobs: any[]) {
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

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);

  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed, provider };
  } catch (e) {
    return { success: false, error: 'Failed to parse AI response', raw: cleaned, provider };
  }
}

// Generate cover letter using the configured provider
async function generateCoverLetter(resume: any, job: any) {
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

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);

  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed, provider };
  } catch (e) {
    return { success: false, error: 'Failed to parse AI response', raw: cleaned, provider };
  }
}

// Generate follow-up email
async function generateFollowUp(resume: any, job: any, daysSinceApplication: number = 7) {
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

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);

  try {
    return { success: true, data: JSON.parse(cleaned), provider };
  } catch (e) {
    return { success: false, error: 'Failed to parse response', raw: cleaned, provider };
  }
}

// Generate thank you email
async function generateThankYou(resume: any, job: any, interviewerName?: string) {
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

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);

  try {
    return { success: true, data: JSON.parse(cleaned), provider };
  } catch (e) {
    return { success: false, error: 'Failed to parse response', raw: cleaned, provider };
  }
}

// Analyze job fit
async function analyzeJobFit(resume: any, job: any) {
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

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);

  try {
    return { success: true, data: JSON.parse(cleaned), provider };
  } catch (e) {
    return { success: false, error: 'Failed to parse response', raw: cleaned, provider };
  }
}


// Draft answers to an application form's screening questions, strictly from
// what the candidate wrote about themselves. Anything the profile does not
// cover is left empty and flagged, never guessed: these answers are submitted
// to employers under the candidate's name.
async function answerQuestions(profile: any, questions: any[], job: any) {
  const list = (questions || []).slice(0, 25).map((q: any, i: number) => ({
    id: String(q.id ?? i),
    question: String(q.question || '').slice(0, 400),
    type: String(q.type || 'text'),
    options: Array.isArray(q.options) ? q.options.slice(0, 15).map((o: any) => String(o).slice(0, 120)) : [],
  }));
  if (!list.length) return { success: true, data: { answers: [] } };

  const prompt = `You are helping a job candidate fill in an employer's screening questions.
Answer ONLY from the candidate profile below. Never invent experience, numbers, employers, tools or achievements.
If the profile does not contain what a question needs, return an empty answer and set "needs_input" to a short note saying what the candidate must add.

Candidate profile:
- Name: ${profile.name || ''}
- City: ${profile.city || ''}
- Current / last company: ${profile.company || ''}
- Roles wanted: ${profile.roles || ''}
- Skills: ${profile.skills || ''}
- About / experience (the candidate's own words): ${String(profile.summary || '').slice(0, 2500)}

Job (for context): ${job.title || ''} at ${job.company || ''}

Rules per question type:
- "number": answer with digits only (e.g. "2"). For years of experience in a field, count only experience the profile states for that field; if none is stated, answer "0" only when the profile clearly shows no such experience, otherwise leave it empty with needs_input.
- "select" or "radio": answer with one of the given options, copied exactly.
- "checkbox": answer with the matching options separated by " | ".
- "text" or "textarea": write in first person, specific and honest. Short-answer fields: one or two sentences. Textareas: 3 to 6 sentences.
- Links (portfolio, work samples): only use links that appear in the profile.

How to write a good open answer (this matters most):
- Answer the exact question asked, in its own terms. Do not summarise the resume, and do not mention projects, tools or achievements that are not directly relevant to that question.
- If the question asks how the candidate thinks, works or decides ("how do you...", "why...", "describe your approach", "be honest"), give a clear point of view and the reasoning behind it, then one concrete example from the profile that shows it. Process and judgement matter more than tool names.
- If the question asks for an example or achievement, pick the single most relevant one from the profile and give its situation, what the candidate did, and the result with any numbers the profile states.
- When the profile contains the candidate's own description of how they work (e.g. "How I use AI in writing: ..."), base the answer on it closely and keep their wording.
- Sound like a thoughtful person talking, not a brochure: plain words, varied sentences, no filler such as "Additionally", "leverage", "passionate", "I am excited to", "in today's fast-paced world".
- If the profile gives too little to answer the question well and honestly, still draft the best answer you can from what is there, and set "needs_input" to the specific detail the candidate should add to make it strong (e.g. "add a real example of a piece you wrote with AI help").

Questions (JSON):
${JSON.stringify(list)}

Return ONLY valid JSON, no markdown:
{"answers":[{"id":"<id>","answer":"<text>","needs_input":"<empty string or what is missing>"}]}`;

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    const answers = Array.isArray(parsed?.answers) ? parsed.answers : [];
    return { success: true, data: { answers }, provider };
  } catch (e) {
    return { success: false, error: 'Failed to parse AI response', raw: cleaned, provider };
  }
}


// Kiran's way of writing: he writes the draft himself, then asks AI to check
// grammar and suggest improvements while keeping the essence. This edits his
// draft the same way: light touch, his words and points kept, and each change
// listed so he can accept only the ones that are genuinely better.
async function polishAnswer(question: string, draft: string, profile: any) {
  const text = String(draft || '').trim();
  if (!text) return { success: false, error: 'Write your draft first, then polish it.' };

  const prompt = `You are editing a job candidate's own draft answer to an employer's question.
The candidate's rule: keep the essence, keep their voice and their points, and do not make too many changes.
Only fix grammar, spelling, punctuation and clarity, and tighten wording where it clearly helps.
This goes to an employer, so replace chat-style words ("wanna", "gonna", "so in the..." openers, "any AI tool like") with their plain professional form, and make every sentence grammatically complete.
Keep who does what exactly as the candidate meant it: if a sentence is ambiguous, choose the reading that fits the rest of the draft and do not change its meaning.
Do not add new claims, experience, numbers, tools or examples that are not in the draft.
Do not make it sound corporate or AI-written: no "leverage", "passionate", "Additionally", "In today's world", no em-dash flourishes.
If the draft does not actually answer the question, keep it as close as possible and mention that in "notes".

Question: ${String(question).slice(0, 500)}

Candidate's draft:
"""${text.slice(0, 4000)}"""

Return ONLY valid JSON, no markdown:
{"polished":"<the lightly edited answer>","changes":["<each change, short: what changed and why>"],"notes":"<empty, or one short suggestion the candidate may want to consider>"}`;

  const { text: raw, provider } = await generateText(prompt);
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      success: true,
      data: {
        polished: String(parsed.polished || text),
        changes: Array.isArray(parsed.changes) ? parsed.changes.slice(0, 8) : [],
        notes: String(parsed.notes || ''),
      },
      provider,
    };
  } catch (e) {
    return { success: false, error: 'Failed to parse AI response', raw: cleaned, provider };
  }
}
