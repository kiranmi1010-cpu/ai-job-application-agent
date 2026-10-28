import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { parseResumeWithGemini, ParsedResumeData } from './gemini';

// Configure PDF.js worker to use CDN (bypasses Vite bundling issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export interface ParsedResume extends ParsedResumeData {
  rawText: string;
}

/**
 * Extract text from PDF file using pdfjs-dist
 * All processing happens in the browser - no file system access needed
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const pdfOptions: any = {};
    pdfOptions['data'] = new Uint8Array(arrayBuffer);
    pdfOptions.isEvalSupported = false;
    pdfOptions.useSystemFonts = true;
    
    const loadingTask = pdfjsLib.getDocument(pdfOptions);
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Join text items, handling both string items and other types
      const pageText = textContent.items
        .map((item: any) => {
          if (item && typeof item === 'object' && 'str' in item) {
            return item.str;
          }
          return '';
        })
        .filter(text => text.length > 0)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    const trimmedText = fullText.trim();
    
    if (!trimmedText) {
      throw new Error('No text could be extracted from the PDF. The file may be image-based or corrupted.');
    }
    
    return trimmedText;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    if (error.message?.includes('No text could be extracted')) {
      throw error;
    }
    throw new Error(`Failed to extract text from PDF: ${error.message || 'Unknown error'}. Please ensure the file is a valid PDF.`);
  }
}

/**
 * Extract text from DOCX file using mammoth
 * All processing happens in the browser - no file system access needed
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No text could be extracted from the DOCX file.');
    }
    
    return result.value.trim();
  } catch (error: any) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message || 'Unknown error'}. Please ensure the file is a valid Word document.`);
  }
}

/**
 * Extract text from plain text file
 * All processing happens in the browser - no file system access needed
 */
export async function extractTextFromTxt(file: File): Promise<string> {
  try {
    const text = await file.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('The text file is empty.');
    }
    
    return text.trim();
  } catch (error: any) {
    console.error('Error reading text file:', error);
    throw new Error(`Failed to read text file: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Detect file type from File object
 */
function detectFileType(file: File): 'pdf' | 'docx' | 'doc' | 'txt' | 'unknown' {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return 'docx';
  }
  if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
    return 'doc';
  }
  if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
    return 'txt';
  }
  
  return 'unknown';
}

/**
 * Main function: Extract text from any supported file type
 * All processing happens in the browser - NO file system operations
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = detectFileType(file);
  
  switch (fileType) {
    case 'pdf':
      return extractTextFromPDF(file);
    case 'docx':
      return extractTextFromDocx(file);
    case 'txt':
      return extractTextFromTxt(file);
    case 'doc':
      // Legacy .doc format - try mammoth as it sometimes works
      try {
        return await extractTextFromDocx(file);
      } catch {
        throw new Error('Legacy .doc files are not fully supported. Please save your document as .docx or .pdf format.');
      }
    default:
      throw new Error(`Unsupported file type: ${file.type || file.name}. Please upload a PDF, DOCX, or TXT file.`);
  }
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

/**
 * Main function: Parse a resume file
 * Flow: File → Extract Text (browser) → Send to Gemini API → Return parsed data
 * NO file system operations - everything happens in the browser
 */
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  // Step 1: Extract text from file (all in-browser, no file saving)
  let rawText: string;
  
  try {
    rawText = await extractTextFromFile(file);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to extract text from file');
  }
  
  // Step 2: Try Gemini AI parsing first (sends text to API, not file)
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
  
  // Step 3: Fallback to local parser (no API needed)
  const localParsed = parseResumeTextLocal(rawText);
  
  return {
    rawText,
    ...localParsed
  };
}

// Export for use in other services
export { parseResumeTextLocal as parseResumeText };
