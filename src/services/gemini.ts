// Frontend client for the Gemini API serverless function
// This calls the /api/gemini endpoint on Vercel

const API_URL = '/api/gemini';

export interface GeminiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: string;
}

export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  summary?: string;
}

export interface JobMatchResult {
  jobId: string;
  matchScore: number;
  reasons: string[];
  missingSkills: string[];
  recommendation: 'strong_apply' | 'consider' | 'skip';
}

export type GateResult = 'PASS' | 'FAIL' | 'FLAG';

export interface JobFitAnalysis {
  overallFit: 'excellent' | 'good' | 'moderate' | 'poor';
  matchScore: number;
  verdict?: string;
  advice?: string;
  gates?: Record<'eligibility' | 'language' | 'location', { result: GateResult; note: string }>;
  dimensions?: Record<'technical' | 'experience' | 'culture' | 'career', { score: number; note: string }>;
  strengths: string[];
  gaps: string[];
  stretches?: string[];
  tips: string[];
  questionsForEmployer?: string[];
  postingFlags?: string[];
  shouldApply: boolean;
  summary: string;
}

export interface InterviewPrep {
  pitch: string;
  starStories: Array<{
    title: string;
    competency: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    useFor: string[];
  }>;
  likelyQuestions: Array<{ question: string; why: string; approach: string }>;
  toughQuestions: Array<{ question: string; approach: string }>;
  questionsToAsk: string[];
  researchBefore: string[];
  postingFlags?: string[];
}

export interface JobPreferences {
  desiredRoles?: string;
  locationPreference?: string;
  jobTypes?: string;
  salaryRange?: string;
  languages?: string;
  workAuthorization?: string;
}

export interface EmailContent {
  subject: string;
  body: string;
  stretches?: string[];
  changes?: string[];
  lintIssues?: string[];
  postingFlags?: string[];
}

async function callGemini<T>(action: string, data: any): Promise<GeminiResponse<T>> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// Parse resume using Gemini AI
export async function parseResumeWithGemini(text: string): Promise<GeminiResponse<ParsedResumeData>> {
  return callGemini<ParsedResumeData>('parse-resume', { text });
}

// Match jobs to resume using Gemini AI
export async function matchJobsWithGemini(
  resume: ParsedResumeData,
  jobs: any[]
): Promise<GeminiResponse<JobMatchResult[]>> {
  return callGemini<JobMatchResult[]>('match-jobs', { resume, jobs });
}

// Generate cover letter using Gemini AI
// Drafted, then reviewed and rewritten by an editor pass on the server.
// notes: the candidate's own points for this letter; voice: a sample of their writing.
export async function generateCoverLetterWithGemini(
  resume: ParsedResumeData,
  job: any,
  opts: { notes?: string; voice?: string; preferences?: JobPreferences } = {}
): Promise<GeminiResponse<EmailContent>> {
  return callGemini<EmailContent>('generate-cover-letter', { resume, job, ...opts });
}

// Generate follow-up email using Gemini AI
export async function generateFollowUpWithGemini(
  resume: ParsedResumeData,
  job: any,
  daysSinceApplication: number = 7
): Promise<GeminiResponse<EmailContent>> {
  return callGemini<EmailContent>('generate-follow-up', { resume, job, daysSinceApplication });
}

// Generate thank you email using Gemini AI
export async function generateThankYouWithGemini(
  resume: ParsedResumeData,
  job: any,
  interviewerName?: string
): Promise<GeminiResponse<EmailContent>> {
  return callGemini<EmailContent>('generate-thank-you', { resume, job, interviewerName });
}

// Analyze job fit: gates (eligibility, language, location) plus four weighted
// dimensions, following the ai-job-search evaluation framework.
export async function analyzeJobFitWithGemini(
  resume: ParsedResumeData,
  job: any,
  preferences: JobPreferences = {}
): Promise<GeminiResponse<JobFitAnalysis>> {
  return callGemini<JobFitAnalysis>('analyze-job-fit', { resume, job, preferences });
}

// Interview prep pack: STAR stories from the resume, likely and tough questions,
// and questions to ask the interviewer.
export async function interviewPrepWithGemini(
  resume: ParsedResumeData,
  job: any,
  preferences: JobPreferences = {}
): Promise<GeminiResponse<InterviewPrep>> {
  return callGemini<InterviewPrep>('interview-prep', { resume, job, preferences });
}

// Check if Gemini API is available
export async function checkGeminiAvailability(): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch {
    return false;
  }
}
