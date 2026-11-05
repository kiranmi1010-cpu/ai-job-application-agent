if (!window.__jobpilotAssist) {
window.__jobpilotAssist = true;
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

function extractJob() {
  const ld = fromJsonLd();
  const site = fromSite();
  const pick = (a, b) => (a && a.length > 12 ? a : b || a || '');
  const job = {
    title: pick(ld?.title, site.title) || document.title.split('|')[0].trim(),
    company: pick(ld?.company, site.company),
    location: pick(ld?.location, site.location),
    description: (ld?.description || site.description || '').slice(0, MAX_DESCRIPTION),
    url: location.href,
    source: ld ? 'schema.org' : site.source,
  };
  return job;
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

// Lets the popup fill every frame (embedded Greenhouse/Lever forms live in iframes).
window.__jobpilotFill = fillApplication;

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
  if (message?.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

}
