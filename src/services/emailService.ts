import { ParsedResume } from './resumeParser';
import { JobListing } from './jobSearch';

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: string[];
}

// Generate a professional cover letter email
export function generateCoverLetterEmail(
  resume: ParsedResume,
  job: JobListing
): EmailDraft {
  const subject = `Application for ${job.title} - ${resume.name}`;
  
  const body = generateCoverLetterBody(resume, job);
  
  // Find company email (fallback to generic)
  const to = findCompanyEmail(job.company) || `careers@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;
  
  return {
    to,
    subject,
    body,
    attachments: ['Resume.pdf', `Cover_Letter_${job.company.replace(/\s+/g, '_')}.pdf`]
  };
}

function generateCoverLetterBody(resume: ParsedResume, job: JobListing): string {
  const topSkills = resume.skills.slice(0, 5).join(', ');
  const yearsExp = calculateYearsOfExperience(resume);
  const currentRole = resume.experience[0]?.title || 'professional';
  const currentCompany = resume.experience[0]?.company || '';
  
  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With ${yearsExp} years of experience as a ${currentRole}${currentCompany ? ` at ${currentCompany}` : ''}, I am confident in my ability to make meaningful contributions to your team.

My technical expertise includes ${topSkills}, which align perfectly with the requirements for this role. In my current position, I have successfully ${resume.experience[0]?.description || 'delivered high-impact projects and collaborated with cross-functional teams'}.

What excites me about ${job.company} is ${generateCompanyInterest(job)}. I am particularly drawn to the opportunity to ${generateRoleInterest(job, resume)}.

I have attached my resume for your review and would welcome the opportunity to discuss how my skills and experience align with your team's needs. Thank you for considering my application.

Best regards,
${resume.name}
${resume.email}
${resume.phone}`;
}

function calculateYearsOfExperience(resume: ParsedResume): number {
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
  
  return totalYears || 3; // Default to 3 if can't calculate
}

function generateCompanyInterest(job: JobListing): string {
  const interests = [
    `your company's innovative approach to ${job.title.toLowerCase().split(' ')[0]} solutions`,
    `the opportunity to work on cutting-edge projects at ${job.company}`,
    `${job.company}'s reputation for excellence and commitment to quality`,
    `the chance to contribute to ${job.company}'s mission and growth`
  ];
  
  return interests[Math.floor(Math.random() * interests.length)];
}

function generateRoleInterest(job: JobListing, resume: ParsedResume): string {
  const topSkill = resume.skills[0] || 'technology';
  
  const interests = [
    `leverage my expertise in ${topSkill} to drive impactful results`,
    `apply my ${calculateYearsOfExperience(resume)} years of experience to solve complex challenges`,
    `collaborate with your talented team and contribute to ${job.company}'s success`,
    `grow professionally while delivering value to ${job.company}`
  ];
  
  return interests[Math.floor(Math.random() * interests.length)];
}

function findCompanyEmail(company: string): string | null {
  // Common career emails for major companies
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

// Generate follow-up email
export function generateFollowUpEmail(
  resume: ParsedResume,
  job: JobListing,
  daysSinceApplication: number = 7
): EmailDraft {
  const subject = `Follow-up: Application for ${job.title} - ${resume.name}`;
  
  const body = `Dear Hiring Team,

I hope this message finds you well. I am writing to follow up on my application for the ${job.title} position at ${job.company}, which I submitted ${daysSinceApplication} days ago.

I remain very interested in this opportunity and am confident that my skills and experience would be a valuable addition to your team. I wanted to reiterate my enthusiasm for the role and inquire about the status of my application.

If there is any additional information I can provide or if you need any clarification regarding my qualifications, please don't hesitate to reach out.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${resume.name}
${resume.email}
${resume.phone}`;
  
  const to = findCompanyEmail(job.company) || `careers@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;
  
  return {
    to,
    subject,
    body,
    attachments: []
  };
}

// Generate thank you email after interview
export function generateThankYouEmail(
  resume: ParsedResume,
  job: JobListing,
  interviewerName?: string
): EmailDraft {
  const subject = `Thank You - ${job.title} Interview - ${resume.name}`;
  
  const body = `Dear ${interviewerName || 'Hiring Team'},

Thank you so much for taking the time to speak with me today about the ${job.title} position at ${job.company}. I truly enjoyed learning more about the role and your team.

Our conversation further reinforced my interest in this opportunity. I was particularly excited to hear about ${generateInterviewHighlight(job)}. I am confident that my background in ${resume.skills.slice(0, 3).join(', ')} would allow me to make meaningful contributions to your team.

I appreciate the opportunity to discuss how my experience aligns with your needs, and I am very enthusiastic about the possibility of joining ${job.company}.

Thank you again for your time and consideration. I look forward to hearing about next steps.

Best regards,
${resume.name}
${resume.email}
${resume.phone}`;
  
  const to = findCompanyEmail(job.company) || `careers@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;
  
  return {
    to,
    subject,
    body,
    attachments: []
  };
}

function generateInterviewHighlight(job: JobListing): string {
  const highlights = [
    `the innovative projects your team is working on`,
    `the collaborative culture at ${job.company}`,
    `the opportunity to work with cutting-edge technologies`,
    `the impact this role would have on ${job.company}'s goals`
  ];
  
  return highlights[Math.floor(Math.random() * highlights.length)];
}

// Prepare email for Gmail API (base64 encoded)
export function prepareEmailForGmail(email: EmailDraft): string {
  const emailLines = [
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    email.body
  ];
  
  const emailString = emailLines.join('\n');
  
  // Convert to base64 (URL-safe)
  return btoa(unescape(encodeURIComponent(emailString)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send email via Gmail API (requires OAuth token)
export async function sendEmailViaGmail(
  email: EmailDraft,
  accessToken: string
): Promise<boolean> {
  try {
    const encodedEmail = prepareEmailForGmail(email);
    
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending email via Gmail:', error);
    return false;
  }
}

// Open email in Gmail compose window (fallback method)
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
