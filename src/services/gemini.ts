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

export interface JobFitAnalysis {
  overallFit: 'excellent' | 'good' | 'moderate' | 'poor';
  matchScore: number;
  strengths: string[];
  gaps: string[];
  tips: string[];
  shouldApply: boolean;
  summary: string;
}

export interface EmailContent {
  subject: string;
  body: string;
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
export async function generateCoverLetterWithGemini(
  resume: ParsedResumeData,
  job: any
): Promise<GeminiResponse<EmailContent>> {
  return callGemini<EmailContent>('generate-cover-letter', { resume, job });
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

// Analyze job fit using Gemini AI
export async function analyzeJobFitWithGemini(
  resume: ParsedResumeData,
  job: any
): Promise<GeminiResponse<JobFitAnalysis>> {
  return callGemini<JobFitAnalysis>('analyze-job-fit', { resume, job });
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
