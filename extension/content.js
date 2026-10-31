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

const FIELD_HINTS = {
  name: ['name', 'fullname', 'full_name', 'full-name', 'candidate_name', 'applicantname'],
  email: ['email', 'mail', 'e-mail', 'emailaddress'],
  phone: ['phone', 'mobile', 'contact', 'phonenumber', 'telephone'],
  linkedin: ['linkedin'],
  portfolio: ['portfolio', 'website', 'github'],
  cover: ['cover', 'coverletter', 'cover_letter', 'message', 'why', 'summary'],
};

function matches(field, hints) {
  const hay = `${field.name || ''} ${field.id || ''} ${field.placeholder || ''} ${field.getAttribute('aria-label') || ''}`.toLowerCase();
  return hints.some((hint) => hay.includes(hint));
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

function fillApplication(profile) {
  const fields = Array.from(document.querySelectorAll('input, textarea'));
  let filled = 0;
  const map = [
    ['name', profile.name],
    ['email', profile.email],
    ['phone', profile.phone],
    ['linkedin', profile.linkedin],
    ['portfolio', profile.portfolio],
    ['cover', profile.coverLetter || profile.cover],
  ];
  for (const [key, value] of map) {
    if (!value) continue;
    for (const field of fields) {
      if (field.disabled || field.readOnly) continue;
      if (field.value && !matches(field, ['cover'])) continue;
      if (matches(field, FIELD_HINTS[key]) && setValue(field, value)) {
        filled += 1;
        break;
      }
    }
  }
  return filled;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'EXTRACT_JOB') {
    sendResponse({ ok: true, job: extractJob() });
    return true;
  }
  if (message?.type === 'FILL_APPLICATION') {
    const filled = fillApplication(message.profile || {});
    sendResponse({ ok: true, filled });
    return true;
  }
  return false;
});
