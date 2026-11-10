// Re-run when the extension was updated: an older copy left in the tab must
// not stop the new version from loading.
if (window.__jobpilotAssist !== '1.8.0') {
window.__jobpilotAssist = '1.8.0';
// JobPilot Assist — content script.
//
// Reads the posting you are looking at (schema.org JobPosting when the page
// provides it, otherwise site-specific markup) and fills application fields on
// request. It never submits anything: the submit button stays yours to press.

const MAX_DESCRIPTION = 6000;

function text(node) {
  return (node && node.textContent ? node.textContent : '').replace(/\s+/g, ' ').trim();
}

function firstText(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const value = text(el);
    if (value) return value;
  }
  return '';
}

function fromJsonLd() {
  const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  for (const block of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(block.textContent || '');
    } catch {
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      const graph = item && item['@graph'] ? item['@graph'] : null;
      const candidates = graph ? graph : [item];
      for (const node of candidates) {
        const type = node && node['@type'];
        const isJob = Array.isArray(type) ? type.includes('JobPosting') : type === 'JobPosting';
        if (!isJob) continue;
        const org = node.hiringOrganization || {};
        const location = node.jobLocation || {};
        const address = location.address || {};
        return {
          title: text({ textContent: node.title || '' }),
          company: text({ textContent: org.name || '' }),
          location: [address.addressLocality, address.addressRegion, address.addressCountry]
            .filter(Boolean)
            .join(', '),
          description: (node.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          source: 'schema.org',
        };
      }
    }
  }
  return null;
}

function fromSite() {
  const host = location.hostname;

  if (host.includes('linkedin')) {
    return {
      title: firstText(['.job-details-jobs-unified-top-card__job-title h1', '.top-card-layout__title', 'h1']),
      company: firstText(['.job-details-jobs-unified-top-card__company-name a', '.topcard__org-name-link', '.top-card-layout__second-subline a']),
      location: firstText(['.job-details-jobs-unified-top-card__bullet', '.topcard__flavor--bullet']),
      description: firstText(['.jobs-description__content', '.show-more-less-html__markup', '.description__text']),
      source: 'LinkedIn',
    };
  }

  if (host.includes('naukri')) {
    return {
      title: firstText(['h1.styles_jd-header-title__rZwM1', 'h1']),
      company: firstText(['.styles_jd-header-comp-name__MvqAI a', '.jd-header-comp-name a']),
      location: firstText(['.styles_jd-header-locations__Zg8lY', '.loc']),
      description: firstText(['section.styles_job-desc-container__txpYf', '.job-desc', '#job-description']),
      source: 'Naukri',
    };
  }

  if (host.includes('indeed')) {
    return {
      title: firstText(['h1.jobsearch-JobInfoHeader-title', 'h2.jobsearch-JobInfoHeader-title', 'h1']),
      company: firstText(['[data-company-name="true"]', '[data-testid="inlineHeader-companyName"]']),
      location: firstText(['[data-testid="inlineHeader-companyLocation"]', '.jobsearch-JobInfoHeader-companyLocation']),
      description: firstText(['#jobDescriptionText', '.jobsearch-JobComponent-description']),
      source: 'Indeed',
    };
  }

  if (host.includes('glassdoor')) {
    return {
      title: firstText(['[data-test="job-title"]', 'h1']),
      company: firstText(['[data-test="employer-name"]', '[data-test="employer-short-name"]']),
      location: firstText(['[data-test="location"]']),
      description: firstText(['[data-test="jobDescriptionContent"]', '.jobDescriptionContent']),
      source: 'Glassdoor',
    };
  }

  if (host.includes('wellfound')) {
    return {
      title: firstText(['h1', '[class*="jobTitle"]']),
      company: firstText(['a[href^="/company/"]', '[class*="companyName"]']),
      location: firstText(['[class*="location"]']),
      description: firstText(['[class*="description"]']),
      source: 'Wellfound',
    };
  }

  return { title: '', company: '', location: '', description: '', source: host };
}

// Headings that are page furniture, not a job title ("Welcome, Kiran" on the
// Indeed home feed, "Jobs for you", ...).
const NOT_A_TITLE = /^(welcome\b|hi,|hello\b|jobs for you|recommended|top job picks|home$|search|sign in|your job feed|similar jobs)/i;
const goodTitle = (value) => Boolean(value) && value.length >= 4 && value.length <= 160 && !NOT_A_TITLE.test(value);

function visible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// Feeds and split views (Indeed home, LinkedIn jobs, Naukri) show the selected
// job in a side pane next to an Apply button. Find that button, then the
// smallest container around it that has a proper heading: that is the posting.
function fromApplyPane() {
  const applyRe = /^(apply( now| on company (site|website))?|easy apply|quick apply|i'?m interested|apply for this job)$/i;
  const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter(
    (b) => visible(b) && applyRe.test(text(b))
  );
  for (const button of buttons) {
    let node = button.parentElement;
    for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
      const heading = Array.from(node.querySelectorAll('h1, h2, h3, [data-testid*="title" i]')).find(
        (h) => visible(h) && goodTitle(text(h))
      );
      if (!heading) continue;
      // Keep climbing until the container also holds the description.
      let pane = node;
      for (let up = 0; pane && up < 6 && text(pane).length < 600; up++) pane = pane.parentElement;
      pane = pane || node;
      const lines = (pane.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const titleText = text(heading).replace(/\s*-\s*job post$/i, '');
      const at = lines.findIndex((l) => l.includes(titleText.slice(0, 30)));
      const after = at >= 0 ? lines.slice(at + 1, at + 6) : [];
      const company = after.find((l) => l.length < 80 && !/₹|\$|rs\.?\s|a month|a year|lpa|remote|hybrid|apply/i.test(l)) || '';
      const loc = after.find((l) => l !== company && /remote|hybrid|on-?site|india|bengaluru|bangalore|mumbai|delhi|pune|hyderabad|chennai|gurgaon|gurugram|noida|kolkata|,/i.test(l) && l.length < 80) || '';
      const descEl =
        pane.querySelector('#jobDescriptionText, [id*="description" i], [class*="description" i], [data-testid*="description" i]');
      return {
        title: titleText,
        company,
        location: loc,
        description: text(descEl) || lines.slice(at + 1).join(' '),
        pageText: pane.innerText || '',
        source: location.hostname.replace(/^www\./, ''),
      };
    }
  }
  return null;
}

const SALARY_RE = /(₹|rs\.?|inr|\$|€|£)\s?[\d,.]+\s?(k|l|lakh|lakhs|cr)?\s?(?:[-–to]+\s?(₹|rs\.?|inr|\$|€|£)?\s?[\d,.]+\s?(k|l|lakh|lakhs|cr)?)?\s?(a month|per month|\/month|a year|per year|\/year|per annum|p\.a\.|lpa|a day|an hour)?|[\d.]+\s?[-–]\s?[\d.]+\s?(lpa|lakhs?( per annum)?)/i;
const TYPE_RE = /\b(full[- ]time|part[- ]time|permanent|contract(ual)?|internship|temporary|freelance)\b/i;
const MODE_RE = /\b(remote|hybrid|on[- ]?site|work from home|wfh)\b/i;

function extractJob() {
  const ld = fromJsonLd();
  const site = fromSite();
  if (!goodTitle(site.title)) site.title = '';
  const pane = fromApplyPane();
  const pick = (...values) => values.find((v) => v && v.trim()) || '';

  const title = pick(goodTitle(ld?.title) ? ld.title : '', site.title, pane?.title);
  if (!title) {
    const fallback = document.title.split(/[|\-–]/)[0].trim();
    return { title: goodTitle(fallback) && !/indeed|linkedin|naukri|glassdoor/i.test(fallback) ? fallback : '', url: location.href };
  }
  const description = pick(ld?.description, site.description, pane?.description).slice(0, MAX_DESCRIPTION);
  const haystack = [pane?.pageText, description].filter(Boolean).join('\n');
  const salary = (haystack.match(SALARY_RE) || [''])[0].trim();
  const jobType = (haystack.match(TYPE_RE) || [''])[0];
  const mode = (haystack.match(MODE_RE) || [''])[0];

  return {
    title,
    company: pick(ld?.company, site.company, pane?.company),
    location: pick(ld?.location, site.location, pane?.location),
    salary,
    jobType,
    mode,
    description,
    url: location.href,
    source: ld ? 'schema.org' : site.title ? site.source : pane?.source || site.source,
  };
}

// --- every job listed on the page -------------------------------------------
//
// On a search results page or feed (Indeed, LinkedIn, Naukri, foundit, ...)
// collect each job card you can see, so the popup can rank them against you.

const CARD_SELECTORS = [
  '.job_seen_beacon', '[data-jk]', '.jobsearch-ResultsList > li', // Indeed
  'li[data-occludable-job-id]', '.job-card-container', '.jobs-search-results__list-item', '.base-card', // LinkedIn
  '.srp-jobtuple-wrapper', 'article.jobTuple', '.cust-job-tuple', // Naukri
  '[data-test="jobListing"]', 'li.react-job-listing', // Glassdoor
  '.srpResultCardContainer', '.cardContainer', // foundit
  '[class*="job-card" i]', '[class*="jobCard" i]', '[class*="JobCard" i]',
];
const JOB_LINK = /\/(viewjob|rc\/clk|pagead\/clk|jobs\/view|job-listings|job-detail|jobs?\/\d|careers?\/|job\/|position|opening)/i;

function listJobs() {
  const seen = new Set();
  const out = [];
  const push = (card, linkEl) => {
    if (!card || !visible(card)) return;
    const link = linkEl || card.querySelector('a[href]');
    const titleEl =
      card.querySelector('h2 a, h3 a, a.jcs-JobTitle, [class*="title" i] a, a[class*="title" i], h2, h3, [class*="title" i]') || link;
    const title = text(titleEl).replace(/\s*-\s*job post$/i, '').replace(/^new\s+/i, '');
    if (!goodTitle(title) || title.length > 140) return;
    const href = link ? new URL(link.getAttribute('href'), location.href).href : location.href;
    const key = title + '|' + href.split('?')[0];
    if (seen.has(key)) return;
    seen.add(key);
    const lines = (card.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const at = lines.findIndex((l) => l.includes(title.slice(0, 25)));
    const company =
      text(card.querySelector('[data-testid="company-name"], .companyName, [class*="company" i]')) ||
      (at >= 0 ? lines[at + 1] || '' : '');
    const snippet = (card.innerText || '').replace(/\s+/g, ' ').slice(0, 700);
    out.push({
      title,
      company: company.slice(0, 80),
      salary: (snippet.match(SALARY_RE) || [''])[0].trim(),
      snippet,
      url: href,
    });
  };

  for (const selector of CARD_SELECTORS) {
    document.querySelectorAll(selector).forEach((card) => push(card));
    if (out.length >= 8) break;
  }
  // Fallback for sites we don't know: links that look like job postings.
  if (out.length < 3) {
    document.querySelectorAll('a[href]').forEach((a) => {
      if (!JOB_LINK.test(a.getAttribute('href') || '')) return;
      const card = a.closest('li, article, [class*="card" i]') || a.parentElement;
      push(card, a);
    });
  }
  return out.slice(0, 60);
}

// --- autofill ---------------------------------------------------------------
//
// Matches fields by everything a person would read: name/id/placeholder,
// aria-label, autocomplete, and the visible <label>. That is what makes it work
// on company career pages (Greenhouse, Lever, Workday, Ashby, Keka, ...) and not
// only on the big boards.

const FIELD_HINTS = {
  firstName: ['first name', 'firstname', 'first_name', 'given name', 'given-name', 'fname'],
  lastName: ['last name', 'lastname', 'last_name', 'surname', 'family name', 'family-name', 'lname'],
  name: ['full name', 'fullname', 'full_name', 'full-name', 'your name', 'candidate name', 'candidate_name', 'applicantname', 'name'],
  email: ['email', 'e-mail', 'mail'],
  phone: ['phone', 'mobile', 'contact number', 'telephone', 'tel'],
  linkedin: ['linkedin'],
  portfolio: ['portfolio', 'website', 'personal site', 'github', 'url'],
  city: ['current location', 'current city', 'city', 'location'],
  company: ['current company', 'current employer', 'company name', 'employer', 'organization', 'organisation'],
  cover: ['cover letter', 'coverletter', 'cover_letter', 'why do you want', 'why are you interested', 'message', 'additional information', 'summary'],
};

// Fields we must never touch: passwords, salary, captcha, search boxes.
const NEVER = ['password', 'captcha', 'salary', 'ctc', 'search', 'otp', 'coupon', 'card'];

function labelText(field) {
  const parts = [];
  if (field.id) {
    try {
      document.querySelectorAll(`label[for="${CSS.escape(field.id)}"]`).forEach((l) => parts.push(text(l)));
    } catch {
      /* odd id */
    }
  }
  const wrap = field.closest('label');
  if (wrap) parts.push(text(wrap));
  const labelledBy = field.getAttribute('aria-labelledby');
  if (labelledBy) labelledBy.split(/\s+/).forEach((id) => parts.push(text(document.getElementById(id))));
  // Greenhouse/Lever/Workday put the label in the field's container.
  const box = field.closest('.field, .application-question, [data-automation-id], .form-group, li, div');
  if (box && parts.length === 0 && box.querySelectorAll('input, textarea, select').length === 1) {
    const lab = box.querySelector('label, legend, .label, [class*="label"]');
    if (lab) parts.push(text(lab));
  }
  return parts.join(' ');
}

function describe(field) {
  return [
    field.name,
    field.id,
    field.placeholder,
    field.getAttribute('aria-label'),
    field.getAttribute('autocomplete'),
    labelText(field),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function hits(desc, hints) {
  return hints.some((hint) => {
    const h = hint.replace(/[_-]+/g, ' ');
    // Short hints ("name", "tel", "url") must be whole words.
    return h.length <= 4 ? new RegExp(`\\b${h}\\b`).test(desc) : desc.includes(h);
  });
}

function setValue(field, value) {
  if (!value) return false;
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter ? setter.call(field, value) : (field.value = value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));
  return true;
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0] || '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function dataUrlToFile(dataUrl, name, type) {
  const [, b64] = String(dataUrl).split(',');
  const bin = atob(b64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name || 'resume.pdf', { type: type || 'application/pdf' });
}

function attachResume(resume) {
  if (!resume?.data) return false;
  const inputs = Array.from(document.querySelectorAll('input[type="file"]')).filter((f) => !f.disabled);
  if (!inputs.length) return false;
  // Prefer the field that is clearly for a resume/CV, not a cover-letter upload.
  const target =
    inputs.find((f) => /resume|\bcv\b|curriculum/.test(describe(f))) ||
    inputs.find((f) => !/cover/.test(describe(f))) ||
    inputs[0];
  if (target.files && target.files.length) return false; // you already attached one
  try {
    const transfer = new DataTransfer();
    transfer.items.add(dataUrlToFile(resume.data, resume.name, resume.type));
    target.files = transfer.files;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

function fillApplication(profile) {
  const fields = Array.from(document.querySelectorAll('input, textarea')).filter((field) => {
    const type = (field.getAttribute('type') || 'text').toLowerCase();
    const fillable = field instanceof HTMLTextAreaElement || ['text', 'email', 'tel', 'url', ''].includes(type);
    return fillable && !field.disabled && !field.readOnly && field.offsetParent !== null;
  });

  const { first, last } = splitName(profile.name);
  const values = {
    firstName: first,
    lastName: last,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio,
    city: profile.city,
    company: profile.company,
    cover: profile.coverLetter || profile.cover,
  };
  // Most specific first, so "First name" is not filled with the full name.
  const order = ['firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'company', 'city', 'name', 'cover'];

  const used = new Set();
  let filled = 0;
  for (const field of fields) {
    const desc = describe(field);
    if (!desc || hits(desc, NEVER)) continue;
    if (field.value && !(field instanceof HTMLTextAreaElement && hits(desc, FIELD_HINTS.cover))) continue;
    const isTextarea = field instanceof HTMLTextAreaElement;
    for (const key of order) {
      if (!values[key]) continue;
      if (key === 'cover' && !isTextarea) continue;
      if (key !== 'cover' && isTextarea) continue;
      if (key === 'name' && (hits(desc, FIELD_HINTS.firstName) || hits(desc, FIELD_HINTS.lastName) || /company|employer|school|college|reference/.test(desc))) continue;
      if (!hits(desc, FIELD_HINTS[key])) continue;
      if (key !== 'cover' && used.has(key) && key !== 'email') continue;
      if (setValue(field, values[key])) {
        used.add(key);
        filled += 1;
      }
      break;
    }
  }

  const attached = attachResume(profile.resume);
  return { filled, attached };
}

// --- screening questions ------------------------------------------------------
//
// Collects the questions on an application form (Indeed Smart Apply, Workday,
// Greenhouse, ...) so the popup can draft answers, then writes the answers back.

function questionText(field) {
  const own = labelText(field);
  if (own && own.length > 3) return own;
  const group = field.closest('fieldset, [role="radiogroup"], [role="group"], .ia-Questions-item, [class*="question" i], .form-group, li');
  if (group) {
    const lab = group.querySelector('legend, label, [class*="label" i], [id*="label" i], h3, h4, p, span');
    if (lab && text(lab).length > 3) return text(lab);
  }
  return field.getAttribute('aria-label') || field.placeholder || field.name || '';
}

const CONTACT = /\b(first name|last name|full name|your name|e-?mail|phone|mobile|city|postal|zip|address|password|captcha)\b/i;

function listQuestions() {
  const out = [];
  const done = new Set();
  let n = 0;
  const fields = Array.from(document.querySelectorAll('input, textarea, select')).filter((f) => visible(f) && !f.disabled);
  for (const field of fields) {
    const type = field instanceof HTMLTextAreaElement ? 'textarea'
      : field instanceof HTMLSelectElement ? 'select'
      : (field.getAttribute('type') || 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'file', 'password', 'search', 'image', 'reset'].includes(type)) continue;

    if (type === 'radio' || type === 'checkbox') {
      const groupKey = field.name || (field.closest('fieldset, [role="radiogroup"]') || {}).id || '';
      if (!groupKey || done.has(groupKey)) continue;
      done.add(groupKey);
      const members = Array.from(document.querySelectorAll(`input[name="${CSS.escape(field.name)}"]`));
      const group = field.closest('fieldset, [role="radiogroup"], [role="group"]') || field.parentElement?.parentElement;
      const legend = group && group.querySelector('legend, [class*="label" i], h3, h4, p, span');
      const question = text(legend) || questionText(field);
      const options = members.map((m) => labelText(m) || m.value).filter(Boolean);
      const id = 'q' + n++;
      members.forEach((m) => m.setAttribute('data-jobpilot-q', id));
      out.push({ id, question, type, options });
      continue;
    }

    const question = questionText(field);
    if (!question || CONTACT.test(question)) continue;
    const id = 'q' + n++;
    field.setAttribute('data-jobpilot-q', id);
    out.push({
      id,
      question: question.slice(0, 400),
      type: type === 'number' ? 'number' : type,
      options: type === 'select' ? Array.from(field.options).map((o) => o.text.trim()).filter((t) => t && !/^select|^choose|^--/i.test(t)) : [],
      current: field.value || '',
    });
  }
  return out;
}

function answerQuestions(answers) {
  let filled = 0;
  for (const { id, answer } of answers || []) {
    if (!answer) continue;
    const els = Array.from(document.querySelectorAll(`[data-jobpilot-q="${id}"]`));
    if (!els.length) continue;
    const first = els[0];
    const type = (first.getAttribute('type') || '').toLowerCase();
    if (type === 'radio' || type === 'checkbox') {
      const wanted = String(answer).split('|').map((a) => a.trim().toLowerCase()).filter(Boolean);
      for (const el of els) {
        const label = (labelText(el) || el.value).trim().toLowerCase();
        const want = wanted.some((w) => label === w || label.startsWith(w) || w.startsWith(label));
        if (want && !el.checked) {
          el.click();
          filled++;
        }
      }
      continue;
    }
    if (first instanceof HTMLSelectElement) {
      const opt = Array.from(first.options).find((o) => o.text.trim().toLowerCase() === String(answer).trim().toLowerCase())
        || Array.from(first.options).find((o) => o.text.toLowerCase().includes(String(answer).toLowerCase()));
      if (opt) {
        first.value = opt.value;
        first.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      }
      continue;
    }
    if (setValue(first, String(answer))) filled++;
  }
  return filled;
}


// --- Naukri recruiter-question chat ------------------------------------------
//
// Naukri asks screening questions one at a time in a chat drawer whose answer
// box is a contenteditable div, so the normal form scan never sees it. This
// watches the drawer, drafts an answer for each new question from your saved
// details, and types it into the box. It never presses Save: you check the
// answer and click Save yourself.

const NK_MAX = 190; // Naukri silently rejects long chat answers

function nkTrim(answer) {
  let a = String(answer || '').replace(/\s+/g, ' ').trim();
  if (a.length <= NK_MAX) return a;
  a = a.slice(0, NK_MAX);
  const cut = Math.max(a.lastIndexOf('. '), a.lastIndexOf('; '));
  return (cut > 60 ? a.slice(0, cut + 1) : a.replace(/\s+\S*$/, '')).trim();
}

function nkNumber(v) {
  const m = String(v || '').match(/\d+(\.\d+)?/);
  return m ? m[0] : '';
}

// Answers that should come straight from your saved details, not the AI.
function nkQuick(question, profile) {
  const q = question.toLowerCase();
  if (/current\s*(ctc|salary|package)/.test(q) && profile.currentCtc) return nkNumber(profile.currentCtc);
  if (/expected\s*(ctc|salary|package)/.test(q) && profile.expectedCtc) return nkNumber(profile.expectedCtc);
  if (/notice\s*period|join(ing)?\b|how soon|start date/.test(q) && profile.notice) return profile.notice;
  return '';
}

function nkBadge(msg, tone) {
  let b = document.getElementById('jobpilot-badge');
  if (!b) {
    b = document.createElement('div');
    b.id = 'jobpilot-badge';
    b.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:2147483647;max-width:320px;padding:10px 12px;border-radius:10px;font:13px/1.4 system-ui,sans-serif;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.25)';
    document.body.appendChild(b);
  }
  b.style.background = tone === 'error' ? '#b91c1c' : tone === 'wait' ? '#475569' : '#6d28d9';
  b.textContent = 'JP: ' + msg;
}

function nkOptions(drawer) {
  // Radio/checkbox style answers shown as clickable options in the drawer.
  const items = Array.from(drawer.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
  return items.map((el) => ({ el, label: (labelText(el) || el.value || '').trim() })).filter((o) => o.label);
}

let nkLastQuestion = '';
let nkBusy = false;
let nkJob = null;

async function nkHandle() {
  const drawer = document.querySelector('.chatbot_Drawer');
  if (!drawer || nkBusy) return;
  // Only act when the question chat is actually open on screen with its answer box.
  const inputBox = drawer.querySelector('[contenteditable="true"]');
  if (!visible(drawer) || (!inputBox && !drawer.querySelector('input[type="radio"], input[type="checkbox"]'))) return;
  if (inputBox && !visible(inputBox)) return;
  const bots = drawer.querySelectorAll('.botItem .botMsg, li.botItem');
  const last = bots[bots.length - 1];
  const question = text(last);
  if (!question || question === nkLastQuestion) return;
  if (!/\?|\bplease (enter|share|mention|specify)\b/i.test(question)) return;
  if (/thank you for (your )?responses|thank you for showing interest/i.test(question) && !/\?/.test(question)) return;

  const { profile = {} } = await chrome.storage.local.get('profile');
  if (profile.autoChat === false) return;
  nkLastQuestion = question;
  nkBusy = true;
  try {
    if (!nkJob) nkJob = extractJob();
    const options = nkOptions(drawer);
    let answer = nkQuick(question, profile);
    if (!answer) {
      nkBadge('drafting an answer…', 'wait');
      const res = await chrome.runtime.sendMessage({
        type: 'ANSWER_QUESTIONS',
        job: nkJob || {},
        questions: [{
          id: 'nk',
          question: question + (options.length ? '' : ' (Answer in under 190 characters. If it asks for a number of years, reply with just the number.)'),
          type: options.length ? 'radio' : 'text',
          options: options.map((o) => o.label),
        }],
      });
      if (!res?.ok) throw new Error(res?.error || 'no answer');
      answer = (res.answers || [])[0]?.answer || '';
    }
    if (!answer) {
      nkBadge('not sure how to answer this one from your details. Please type it yourself.', 'error');
      return;
    }

    if (options.length) {
      const want = String(answer).toLowerCase();
      const pick = options.find((o) => o.label.toLowerCase() === want) || options.find((o) => want.includes(o.label.toLowerCase()));
      if (pick) {
        pick.el.closest('label, div')?.style.setProperty('outline', '3px solid #8b5cf6');
        nkBadge(`suggests "${pick.label}". Click it if that's right.`);
      } else {
        nkBadge(`suggests: ${answer}`);
      }
      return;
    }

    const box = drawer.querySelector('[contenteditable="true"]');
    if (!box) return;
    // You started typing (or this question has already moved on): never overwrite you.
    const stillSame = text(Array.from(drawer.querySelectorAll('.botItem .botMsg, li.botItem')).pop()) === question;
    if (!stillSame) return;
    if (text(box)) {
      nkBadge('you are already answering this one, so I left it alone.');
      return;
    }
    box.focus();
    document.execCommand('selectAll', false, null);
    const finalAnswer = nkTrim(answer);
    document.execCommand('insertText', false, finalAnswer);
    try { await navigator.clipboard.writeText(finalAnswer); } catch {}
    nkBadge('filled the answer (also copied). Check it, then click Save. If Naukri rejects the application, clear the box and press Ctrl+V instead.');
  } catch (error) {
    nkLastQuestion = ''; // let it retry on the next change
    nkBadge('could not draft an answer (' + (error?.message || error) + '). Type it yourself.', 'error');
  } finally {
    nkBusy = false;
  }
}

if (location.hostname.endsWith('naukri.com') && window === window.top && /saveApply/.test(location.href) && /%22%3A406|":406/.test(location.href)) {
  setTimeout(() => nkBadge('Naukri rejected this application. It usually blocks answers entered by a tool. Reopen the job, click Apply, and paste each answer yourself (JP copies each one for you).', 'error'), 1500);
}

if (location.hostname.endsWith('naukri.com') && window === window.top) {
  // Throttle, not debounce: Naukri's page changes constantly (carousels, ads),
  // so a debounce kept postponing the check. Check at most every 400 ms.
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; nkHandle(); }, 400);
  }).observe(document.documentElement, { childList: true, subtree: true });
}

window.__jobpilotQuestions = listQuestions;
window.__jobpilotAnswer = answerQuestions;

// Lets the popup fill every frame (embedded Greenhouse/Lever forms live in iframes).
window.__jobpilotFill = fillApplication;
window.__jobpilotList = listJobs;
window.__jobpilotExtract = extractJob;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'EXTRACT_JOB') {
    sendResponse({ ok: true, job: extractJob() });
    return true;
  }
  if (message?.type === 'FILL_APPLICATION') {
    const { filled, attached } = fillApplication(message.profile || {});
    sendResponse({ ok: true, filled, attached });
    return true;
  }
  if (message?.type === 'LIST_JOBS') {
    sendResponse({ ok: true, jobs: listJobs() });
    return true;
  }
  if (message?.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

}
