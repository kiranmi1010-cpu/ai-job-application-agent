import { ParsedResumeData } from './gemini';
import { 
  generateCoverLetterWithGemini, 
  generateFollowUpWithGemini, 
  generateThankYouWithGemini,
  EmailContent 
} from './gemini';

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: string[];
}

export interface JobListing {
  externalId?: string;
  id?: number;
  title: string;
  company: string;
  location: string;
  description?: string;
  requirements?: string[];
  url?: string;
}

// Generate cover letter using Gemini AI (primary) with local fallback
export async function generateCoverLetterEmail(
  resume: ParsedResumeData,
  job: JobListing
): Promise<EmailDraft> {
  const to = findCompanyEmail(job.company) || `careers@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;
  
  // Try Gemini first
  try {
    const result = await generateCoverLetterWithGemini(resume, job);
    
    if (result.success && result.data) {
      return {
        to,
        subject: result.data.subject,
        body: result.data.body,
        attachments: ['Resume.pdf', `Cover_Letter_${job.company.replace(/\s+/g, '_')}.pdf`]
      };
    }
  } catch (error) {
    console.warn('Gemini cover letter generation failed, using fallback:', error);
  }
  
  // Fallback to template-based generation
  return generateCoverLetterFallback(resume, job, to);
}

// Generate follow-up email using Gemini AI
export async function generateFollowUpEmail(
  resume: ParsedResumeData,
  job: JobListing,
  daysSinceApplication: number = 7
): Promise<EmailDraft> {
  const to = findCompanyEmail(job.company) || `careers@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;
  
  try {
    const result = await generateFollowUpWithGemini(resume, job, daysSinceApplication);
    
    if (result.success && result.data) {
      return {
        to,
        subject: result.data.subject,
        body: result.data.body,
        attachments: []
      };
    }
  } catch (error) {
    console.warn('Gemini follow-up generation failed, using fallback:', error);
  }
  
  // Fallback
  return {
    to,
    subject: `Follow-up: Application for ${job.title} - ${resume.name}`,
    body: `Dear Hiring Team,

I hope this message finds you well. I am writing to follow up on my application for the ${job.title} position at ${job.company}, which I submitted ${daysSinceApplication} days ago.

I remain very interested in this opportunity and am confident that my skills in ${resume.skills.slice(0, 3).join(', ')} would be valuable to your team.

Thank you for your time and consideration.

Best regards,
${resume.name}
${resume.email}
${resume.phone}`,
    attachments: []
  };
}

// Generate thank you email using Gemini AI
export async function generateThankYouEmail(
  resume: ParsedResumeData,
  job: JobListing,
  interviewerName?: string
): Promise<EmailDraft> {
  const to = findCompanyEmail(job.company) || `careers@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;
  
  try {
    const result = await generateThankYouWithGemini(resume, job, interviewerName);
    
    if (result.success && result.data) {
      return {
        to,
        subject: result.data.subject,
        body: result.data.body,
        attachments: []
      };
    }
  } catch (error) {
    console.warn('Gemini thank you generation failed, using fallback:', error);
  }
  
  // Fallback
  return {
    to,
    subject: `Thank You - ${job.title} Interview - ${resume.name}`,
    body: `Dear ${interviewerName || 'Hiring Team'},

Thank you for taking the time to speak with me about the ${job.title} position at ${job.company}. I enjoyed learning more about the role and your team.

I am very enthusiastic about the opportunity to contribute my skills in ${resume.skills.slice(0, 3).join(', ')} to ${job.company}.

Thank you again for your consideration.

Best regards,
${resume.name}
${resume.email}
${resume.phone}`,
    attachments: []
  };
}

// Local fallback for cover letter generation
function generateCoverLetterFallback(
  resume: ParsedResumeData,
  job: JobListing,
  to: string
): EmailDraft {
  const topSkills = resume.skills.slice(0, 5).join(', ');
  const yearsExp = calculateYearsOfExperience(resume);
  const currentRole = resume.experience[0]?.title || 'professional';
  const currentCompany = resume.experience[0]?.company || '';
  
  const body = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With ${yearsExp} years of experience as a ${currentRole}${currentCompany ? ` at ${currentCompany}` : ''}, I am confident in my ability to make meaningful contributions to your team.

My technical expertise includes ${topSkills}, which align well with the requirements for this role. In my current position, I have successfully delivered high-impact projects and collaborated with cross-functional teams.

What excites me about ${job.company} is the opportunity to work on innovative solutions and grow professionally. I am particularly drawn to the chance to leverage my experience to drive impactful results.

I have attached my resume for your review and would welcome the opportunity to discuss how my skills and experience align with your team's needs.

Best regards,
${resume.name}
${resume.email}
${resume.phone}`;

  return {
    to,
    subject: `Application for ${job.title} - ${resume.name}`,
    body,
    attachments: ['Resume.pdf', `Cover_Letter_${job.company.replace(/\s+/g, '_')}.pdf`]
  };
}

function calculateYearsOfExperience(resume: ParsedResumeData): number {
  let totalYears = 0;
  
  resume.experience.forEach(exp => {
    const durationMatch = exp.duration.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Current)/i);
    if (durationMatch) {
      const startYear = parseInt(durationMatch[1]);
      const endYear = durationMatch[2].toLowerCase() === 'present' || durationMatch[2].toLowerCase() === 'current'
        ? new Date().getFullYear()
        : parseInt(durationMatch[2]);
      totalYears += (endYear - startYear);
    }
  });
  
  return totalYears || 3;
}

function findCompanyEmail(company: string): string | null {
  const companyEmails: { [key: string]: string } = {
    'Google': 'careers@google.com',
    'Meta': 'talent@meta.com',
    'Amazon': 'sde-careers@amazon.com',
    'Microsoft': 'careers@microsoft.com',
    'Apple': 'jobs@apple.com',
    'Netflix': 'jobs@netflix.com',
    'Stripe': 'careers@stripe.com',
    'Airbnb': 'careers@airbnb.com',
    'Uber': 'careers@uber.com',
    'Lyft': 'careers@lyft.com',
    'Spotify': 'jobs@spotify.com',
    'Twitter': 'careers@twitter.com',
    'LinkedIn': 'careers@linkedin.com',
    'Salesforce': 'careers@salesforce.com',
    'Adobe': 'careers@adobe.com',
    'Oracle': 'careers@oracle.com'
  };
  
  return companyEmails[company] || null;
}

// Open email in Gmail compose window
export function openInGmail(email: EmailDraft): void {
  const subject = encodeURIComponent(email.subject);
  const body = encodeURIComponent(email.body);
  const to = encodeURIComponent(email.to);
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
  
  window.open(gmailUrl, '_blank');
}

// Open email in default mail client
export function openInMailClient(email: EmailDraft): void {
  const subject = encodeURIComponent(email.subject);
  const body = encodeURIComponent(email.body);
  const to = encodeURIComponent(email.to);
  
  const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
  
  window.location.href = mailtoUrl;
}
