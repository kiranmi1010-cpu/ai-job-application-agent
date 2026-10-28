import * as pdfjsLib from 'pdfjs-dist';
import { parseResumeWithGemini, ParsedResumeData } from './gemini';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedResume extends ParsedResumeData {
  rawText: string;
}

// Extract text from PDF file
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

// Extract text from DOC/DOCX (simplified)
export async function extractTextFromDoc(file: File): Promise<string> {
  const text = await file.text();
  return text;
}

// Local fallback parser (used when Gemini API is unavailable)
export function parseResumeTextLocal(text: string): Omit<ParsedResumeData, 'rawText'> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const name = extractName(lines);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const skills = extractSkills(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  
  return { name, email, phone, skills, experience, education };
}

function extractName(lines: string[]): string {
  const candidates = lines.slice(0, 5).filter(line => {
    return !line.includes('@') && 
           !line.match(/^\+?[\d\s\-\(\)]+$/) &&
           line.length > 3 && 
           line.length < 50 &&
           !line.toLowerCase().includes('resume') &&
           !line.toLowerCase().includes('curriculum');
  });
  
  return candidates[0] || 'Unknown';
}

function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : '';
}

function extractPhone(text: string): string {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : '';
}

function extractSkills(text: string): string[] {
  const skillsSet = new Set<string>();
  
  const technicalSkills = [
    'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', 
    'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'HTML', 'CSS', 'SASS',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'AWS', 'Azure', 'GCP',
    'Docker', 'Kubernetes', 'Jenkins', 'Git', 'CI/CD', 'REST', 'GraphQL', 'gRPC',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Data Science',
    'React Native', 'Flutter', 'iOS', 'Android', 'Linux', 'Unix', 'Bash', 'PowerShell',
    'Agile', 'Scrum', 'JIRA', 'TDD', 'BDD', 'Microservices', 'Serverless',
    'Webpack', 'Vite', 'Next.js', 'Express', 'Django', 'Flask', 'Spring',
    'Redux', 'MobX', 'Context API', 'Hooks', 'Testing', 'Jest', 'Mocha', 'Cypress'
  ];
  
  const textLower = text.toLowerCase();
  
  technicalSkills.forEach(skill => {
    if (textLower.includes(skill.toLowerCase())) {
      skillsSet.add(skill);
    }
  });
  
  return Array.from(skillsSet).slice(0, 20);
}

function extractExperience(text: string): Array<{title: string; company: string; duration: string; description: string}> {
  const experience: Array<{title: string; company: string; duration: string; description: string}> = [];
  
  const expSectionMatch = text.match(/experience[:\s]*([\s\S]*?)(?=\n\s*education|\n\s*skills|\n\s*projects|$)/i);
  
  if (expSectionMatch) {
    const expText = expSectionMatch[1];
    const jobBlocks = expText.split(/\n(?=[A-Z][a-z]+ [A-Z]|Senior |Junior |Lead |Staff )/);
    
    jobBlocks.forEach(block => {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length >= 2) {
        const title = lines[0] || '';
        const company = lines[1] || '';
        const durationMatch = block.match(/(\d{4}\s*[-–]\s*(?:\d{4}|Present|Current))/i);
        const duration = durationMatch ? durationMatch[0] : '';
        const description = lines.slice(2).join(' ').substring(0, 200);
        
        if (title && company) {
          experience.push({ title, company, duration, description });
        }
      }
    });
  }
  
  return experience.slice(0, 5);
}

function extractEducation(text: string): Array<{degree: string; institution: string; year: string}> {
  const education: Array<{degree: string; institution: string; year: string}> = [];
  
  const eduSectionMatch = text.match(/education[:\s]*([\s\S]*?)(?=\n\s*experience|\n\s*skills|\n\s*projects|$)/i);
  
  if (eduSectionMatch) {
    const eduText = eduSectionMatch[1];
    
    const degreePatterns = [
      /(B\.?S\.?|B\.?A\.?|Bachelor).*?(?:in|of)\s+([^\n]+)/i,
      /(M\.?S\.?|M\.?A\.?|Master).*?(?:in|of)\s+([^\n]+)/i,
      /(Ph\.?D|Doctorate).*?(?:in|of)\s+([^\n]+)/i
    ];
    
    degreePatterns.forEach(pattern => {
      const matches = eduText.matchAll(pattern);
      for (const match of matches) {
        const degree = match[0];
        const institutionMatch = eduText.match(/(?:at|from|,)\s+([A-Z][a-zA-Z\s]+(?:University|College|Institute|School))/i);
        const institution = institutionMatch ? institutionMatch[1].trim() : '';
        const yearMatch = eduText.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : '';
        
        education.push({ degree, institution, year });
      }
    });
  }
  
  return education.slice(0, 3);
}

// Main function: Try Gemini first, fallback to local parser
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  let rawText = '';
  
  if (file.type === 'application/pdf') {
    rawText = await extractTextFromPDF(file);
  } else if (file.type === 'application/msword' || 
             file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    rawText = await extractTextFromDoc(file);
  } else if (file.type === 'text/plain') {
    rawText = await file.text();
  } else {
    throw new Error('Unsupported file format. Please upload PDF, DOC, DOCX, or TXT files.');
  }
  
  // Try Gemini AI parsing first
  try {
    const geminiResult = await parseResumeWithGemini(rawText);
    
    if (geminiResult.success && geminiResult.data) {
      return {
        rawText,
        ...geminiResult.data,
        // Ensure all fields have defaults
        name: geminiResult.data.name || extractName(rawText.split('\n')),
        email: geminiResult.data.email || extractEmail(rawText),
        phone: geminiResult.data.phone || extractPhone(rawText),
        skills: geminiResult.data.skills?.length ? geminiResult.data.skills : extractSkills(rawText),
        experience: geminiResult.data.experience?.length ? geminiResult.data.experience : extractExperience(rawText),
        education: geminiResult.data.education?.length ? geminiResult.data.education : extractEducation(rawText),
      };
    }
  } catch (error) {
    console.warn('Gemini parsing failed, falling back to local parser:', error);
  }
  
  // Fallback to local parser
  const localParsed = parseResumeTextLocal(rawText);
  
  return {
    rawText,
    ...localParsed
  };
}

// Export for use in other services
export { parseResumeTextLocal as parseResumeText };
