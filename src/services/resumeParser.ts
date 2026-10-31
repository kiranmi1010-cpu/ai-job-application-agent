import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { parseResumeWithGemini, ParsedResumeData } from './gemini';

// Use the LEGACY pdf.js build (library + worker must be the same build).
// The v6 main build calls Uint8Array.prototype.toHex() while Chrome 130 doesn't
// have it, so every upload died with "a.toHex is not a function". The legacy
// build ships the polyfill for that method, so it works everywhere.
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Field-neutral on purpose: an accounting, sales or teaching resume has to yield
// just as many usable skills as a software one, because the search and the
// match score are both built from this list.
const SKILL_VOCABULARY: string[] = [
  // office / general
  'Microsoft Excel', 'Advanced Excel', 'MS Excel', 'Microsoft Office', 'MS Office',
  'PowerPoint', 'Google Sheets', 'Data Entry', 'Reporting', 'Documentation',
  'Communication', 'Leadership', 'Team Management', 'Problem Solving',
  'Time Management', 'Negotiation', 'Presentation', 'Customer Service',
  'Multitasking', 'Analytical Skills',
  // accounting / finance
  'Tally', 'Tally ERP', 'SAP', 'QuickBooks', 'Zoho Books', 'GST', 'GST Filing',
  'GST Returns', 'TDS', 'Income Tax', 'Taxation', 'Bookkeeping', 'Accounts Payable',
  'Accounts Receivable', 'Bank Reconciliation', 'Reconciliation', 'Payroll',
  'Financial Reporting', 'Financial Analysis', 'Auditing', 'Budgeting',
  'Forecasting', 'VAT', 'Invoice Processing', 'Billing', 'Cost Accounting',
  'General Ledger', 'MIS Reporting', 'Compliance', 'Balance Sheet',
  // sales / marketing
  'B2B Sales', 'B2C Sales', 'Inside Sales', 'Field Sales', 'Lead Generation',
  'Cold Calling', 'CRM', 'Salesforce', 'Business Development',
  'Account Management', 'Digital Marketing', 'SEO', 'Social Media Marketing',
  'Content Marketing', 'Email Marketing', 'Google Analytics', 'Market Research',
  'Brand Management', 'Campaign Management', 'Client Relationship Management',
  'Upselling', 'Territory Management',
  // HR / admin
  'Recruitment', 'Talent Acquisition', 'Onboarding', 'Employee Engagement',
  'HRIS', 'Performance Management', 'Payroll Processing', 'Sourcing',
  'Screening', 'Interviewing', 'HR Operations', 'Administration',
  // operations / supply chain / retail
  'Inventory Management', 'Supply Chain', 'Logistics', 'Warehouse Management',
  'Procurement', 'Vendor Management', 'Quality Control', 'Quality Assurance',
  'Production Planning', 'Merchandising', 'Store Operations', 'Cash Handling',
  'Dispatch', 'Route Planning', 'Stock Audit',
  // healthcare / education / legal / support
  'Patient Care', 'Clinical', 'Nursing', 'Pharmacy', 'Medical Billing',
  'Teaching', 'Curriculum Development', 'Lesson Planning', 'Classroom Management',
  'Legal Research', 'Contract Drafting', 'Customer Support', 'Technical Support',
  'Ticketing', 'Escalation Management', 'Escalation Handling',
  // technology (still fully supported)
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python',
  'Java', 'C++', 'C#', 'Rust', 'PHP', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'REST',
  'GraphQL', 'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch',
  'Flutter', 'React Native', 'HTML', 'CSS', 'Agile', 'Scrum', 'JIRA',
];

function extractSkills(text: string): string[] {
  const found = new Set<string>();

  const add = (value: string) => {
    const clean = value
      .replace(/^[\s•\-–—*·|,;:]+/, '')
      .replace(/[\s•\-–—*·|,;:]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;
    if (clean.length < 2 || clean.length > 40) return;
    if (clean.split(' ').length > 4) return;
    if (/^(and|or|etc|skills?|other|various|tools?|technologies)$/i.test(clean)) return;
    const duplicate = Array.from(found).some((item) => item.toLowerCase() === clean.toLowerCase());
    if (!duplicate) found.add(clean);
  };

  // 1) Whatever the candidate listed under a skills-style heading, in their own
  // words. Inline ("Skills: Tally, GST") and block formats are both handled.
  const inline = text.match(/^[ \t]*(?:key |core |technical |professional )?(?:skills|competencies|expertise|proficiencies)[ \t]*[:\-][ \t]*(.+)$/im);
  if (inline && inline[1]) {
    inline[1].split(/[\n,;|•·]+/).forEach(add);
  }

  const heading = text.match(/^[ \t]*(?:key |core |technical |professional )?(?:skills|competencies|expertise|proficiencies|tools(?: &| and)? technologies)[ \t]*:?[ \t]*$/im);
  if (heading && heading.index !== undefined) {
    const rest = text.slice(heading.index + heading[0].length);
    const stop = rest.search(/\n[ \t]*(?:experience|work experience|employment|education|projects?|certifications?|achievements?|awards?|languages?|interests?|references?|personal details)[ \t]*:?[ \t]*\n/i);
    const section = stop >= 0 ? rest.slice(0, stop) : rest.slice(0, 600);
    section.split(/[\n,;|•·]+/).forEach(add);
  }

  // 2) Domain tools and skills that appear anywhere in the text, so a resume
  // without a tidy "Skills" heading still produces real search terms.
  const lower = text.toLowerCase();
  SKILL_VOCABULARY.forEach((skill) => {
    const needle = skill.toLowerCase();
    const hit = needle.length <= 4
      ? new RegExp(`(^|[^a-z])${escapeRegex(needle)}([^a-z]|$)`, 'i').test(lower)
      : lower.includes(needle);
    if (hit) add(skill);
  });

  return Array.from(found).slice(0, 20);
}

const RESUME_ROLE_WORDS = /\b(manager|management|executive|officer|engineer|developer|analyst|accountant|accounts|assistant|specialist|consultant|advisor|coordinator|supervisor|lead|head|clerk|nurse|teacher|trainer|designer|technician|operator|receptionist|sales|marketing|recruiter|administrator|architect|auditor|cashier|intern|associate|director|agent|representative|scientist|writer|editor|paralegal|pharmacist|chef|security|superintendent|deputy|president|owner|partner)\b/i;

const RESUME_YEAR_RANGE = /((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|till\s+date|date)/i;

function extractExperience(text: string): Array<{title: string; company: string; duration: string; description: string}> {
  const experience: Array<{title: string; company: string; duration: string; description: string}> = [];

  // Prefer the experience section, but fall back to the whole document: plenty
  // of resumes label it "Employment History", "Career", or nothing at all.
  let section = text;
  const headingMatch = text.match(/(?:work\s+)?experience|employment\s+history|professional\s+experience|career\s+history|work\s+history/i);
  if (headingMatch && headingMatch.index !== undefined) {
    const rest = text.slice(headingMatch.index + headingMatch[0].length);
    const stop = rest.search(/\n[ \t]*(?:education|academic|skills|projects?|certifications?|achievements?|awards?|languages?|interests?|references?)[ \t]*:?[ \t]*\n/i);
    section = stop >= 0 ? rest.slice(0, stop) : rest;
  }

  const lines = section
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let block: string[] = [];

  const flush = () => {
    const blockText = block.join(' ');
    const range = blockText.match(RESUME_YEAR_RANGE);
    if (!range) {
      block = [];
      return;
    }

    const duration = range[1] + ' - ' + range[2];
    // A "Core Competencies: B2B Sales" line is a skills heading, not a job title.
    const isHeading = (line: string) =>
      /^(core |key |technical |professional )?(competencies|skills|expertise|proficiencies)/i.test(line) ||
      /^[A-Za-z][A-Za-z /&]{1,24}:/.test(line);
    const titleLine =
      block.find((line) => RESUME_ROLE_WORDS.test(line) && line.length <= 90 && !isHeading(line)) ||
      block.find((line) => !isHeading(line)) ||
      block[0];

    // "Accounts Executive, Sharma Traders" puts title and company on one line.
    const parts = titleLine.replace(RESUME_YEAR_RANGE, '').split(/\s*(?:\||•|·|,)\s*/).filter(Boolean);
    let title = (parts[0] || '').trim();
    if (title.includes(':')) title = title.split(':').pop()!.trim();

    let company = (parts[1] || '').trim();
    if (!company) {
      const neighbour = block.find((line) => line !== titleLine && !RESUME_YEAR_RANGE.test(line) && line.length <= 90);
      company = neighbour ? neighbour.split(/\s*(?:\||•|·|,)\s*/)[0].trim() : '';
    }

    const description = block.filter((line) => line !== titleLine && line !== company).join(' ').slice(0, 200);

    if (title.length > 2) experience.push({ title, company, duration, description });
    block = [];
  };

  lines.forEach((line) => {
    block.push(line);
    if (RESUME_YEAR_RANGE.test(line)) flush();
    else if (block.length > 6) block = block.slice(-3);
  });

  return experience.slice(0, 5);
}

function extractEducation(text: string): Array<{degree: string; institution: string; year: string}> {
  const education: Array<{degree: string; institution: string; year: string}> = [];
  
  const eduSectionMatch = text.match(/education[:\s]*([\s\S]*?)(?=\n\s*experience|\n\s*skills|\n\s*projects|$)/i);
  
  if (eduSectionMatch) {
    const eduText = eduSectionMatch[1];
    
    const degreePatterns = [
      /(B\.?S\.?|B\.?A\.?|Bachelor).*?(?:in|of)\s+([^\n]+)/gi,
      /(M\.?S\.?|M\.?A\.?|Master).*?(?:in|of)\s+([^\n]+)/gi,
      /(Ph\.?D|Doctorate).*?(?:in|of)\s+([^\n]+)/gi
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
