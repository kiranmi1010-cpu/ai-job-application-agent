// JobPilot Assist — popup logic.

const el = (id) => document.getElementById(id);

const ui = {
  jobTitle: el('jobTitle'),
  jobMeta: el('jobMeta'),
  jobFacts: el('jobFacts'),
  fitCard: el('fitCard'),
  fitRing: el('fitRing'),
  fitScore: el('fitScore'),
  fitLabel: el('fitLabel'),
  fitNote: el('fitNote'),
  matched: el('matched'),
  missing: el('missing'),
  matchedLabel: el('matchedLabel'),
  missingLabel: el('missingLabel'),
  desc: el('desc'),
  draft: el('draftBtn'),
  rescan: el('rescanBtn'),
  copy: el('copyBtn'),
  fill: el('fillBtn'),
  status: el('status'),
  letter: el('letter'),
  name: el('name'),
  email: el('email'),
  phone: el('phone'),
  skills: el('skills'),
  linkedin: el('linkedin'),
  city: el('city'),
  company: el('company'),
  portfolio: el('portfolio'),
  resumeFile: el('resumeFile'),
  resumeName: el('resumeName'),
  saveProfile: el('saveProfileBtn'),
  roles: el('roles'),
  summary: el('summary'),
  answer: el('answerBtn'),
  qa: el('qa'),
  fillAnswers: el('fillAnswersBtn'),
  rank: el('rankBtn'),
  ranked: el('ranked'),
};

let currentJob = null;
let currentTabId = null;

function setStatus(message, kind) {
  ui.status.textContent = message || '';
  ui.status.className = 'status' + (kind ? ' ' + kind : '');
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// Boards and common ATS pages get the content script automatically. On any
// other careers page, inject it now (allowed by activeTab when you click).
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['content.js'] }).catch(() =>
      chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
    );
  }
}

// --- what the job asks for vs what you have ----------------------------------

// Skills and keywords that show up in strategy, business and marketing roles.
// The job's keywords are whichever of these (plus your own skills) appear in
// its description.
const VOCAB = [
  'market research', 'business strategy', 'strategic planning', 'business planning', 'strategy', 'business analysis',
  'business development', 'operations', 'project management', 'program management', 'stakeholder management',
  'financial modelling', 'financial modeling', 'forecasting', 'budgeting', 'p&l', 'unit economics', 'pricing',
  'competitive analysis', 'go-to-market', 'gtm', 'growth', 'lead generation', 'sales', 'b2b', 'b2c', 'saas',
  'digital marketing', 'performance marketing', 'seo', 'sem', 'social media', 'content marketing', 'email marketing',
  'brand', 'branding', 'campaign', 'events', 'sponsorship', 'partnerships', 'crm', 'hubspot', 'salesforce',
  'google analytics', 'analytics', 'data analysis', 'excel', 'powerpoint', 'sql', 'python', 'power bi', 'tableau',
  'dashboards', 'kpi', 'okr', 'presentation', 'communication', 'negotiation', 'leadership', 'team management',
  'process improvement', 'customer success', 'customer experience', 'product management', 'product marketing',
  'research', 'consulting', 'mba', 'learning and development', 'l&d', 'training', 'instructional design', 'hr',
  'recruitment', 'supply chain', 'procurement', 'ai', 'automation',
];

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function hasTerm(haystack, term) {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${t}([^a-z]|$)`, 'i').test(haystack);
}

function analyseFit(job, profile) {
  const description = norm([job.title, job.description].join(' '));
  const mine = String(profile.skills || '')
    .split(/[,;\n]/)
    .map(norm)
    .filter(Boolean);
  const asked = [...new Set([...VOCAB, ...mine].filter((term) => hasTerm(description, term)))];
  // "strategy" is implied once a more specific strategy term matched.
  const specific = asked.filter((t) => !(t === 'strategy' && asked.some((o) => o !== t && o.includes('strategy'))));
  const have = specific.filter((t) => mine.some((m) => m === t || m.includes(t) || t.includes(m)));
  const gaps = specific.filter((t) => !have.includes(t));
  const score = specific.length ? Math.round((have.length / specific.length) * 100) : null;
  return { have, gaps, score, hasSkills: mine.length > 0 };
}

const DEFAULT_ROLES = "strategy, strategic planning, business planning, founder's office, market research, business analyst, consulting, marketing";

// Score one listed job: how well its title matches the roles you want (most of
// the weight), plus how many of your skills its card text mentions.
function scoreListing(job, profile) {
  const roles = String(profile.roles || DEFAULT_ROLES).split(/[,;\n]/).map(norm).filter(Boolean);
  const skills = String(profile.skills || '').split(/[,;\n]/).map(norm).filter(Boolean);
  const title = norm(job.title);
  const body = norm(job.snippet);
  let roleScore = 0;
  for (const role of roles) {
    if (hasTerm(title, role)) roleScore = Math.max(roleScore, 1);
    else {
      const words = role.split(' ').filter((w) => w.length > 3);
      const hit = words.filter((w) => title.includes(w)).length;
      if (words.length) roleScore = Math.max(roleScore, (hit / words.length) * 0.7);
    }
  }
  const skillHits = skills.filter((s) => hasTerm(body, s)).length;
  const skillScore = skills.length ? Math.min(1, skillHits / Math.min(4, skills.length)) : 0;
  const senior = /\b(head|director|vp|vice president|chief|principal|senior manager|lead)\b/i.test(job.title) ? 0.85 : 1;
  return Math.round((roleScore * 0.7 + skillScore * 0.3) * 100 * senior);
}

async function rankPage() {
  if (!currentTabId) {
    const tab = await getActiveTab();
    currentTabId = tab?.id;
  }
  ui.rank.disabled = true;
  ui.ranked.innerHTML = '<span class="muted">Reading the jobs on this page…</span>';
  try {
    await ensureContentScript(currentTabId);
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTabId, allFrames: false },
      func: () => (window.__jobpilotList ? window.__jobpilotList() : []),
    });
    const jobs = results?.[0]?.result || [];
    if (!jobs.length) {
      ui.ranked.innerHTML =
        '<span class="muted">No job list found here. Open a search results page (e.g. search "strategy analyst Bengaluru" on Indeed, LinkedIn or Naukri), scroll down a little, then try again.</span>';
      return;
    }
    const { profile = {} } = await chrome.storage.local.get('profile');
    const ranked = jobs
      .map((job) => ({ ...job, score: scoreListing(job, profile) }))
      .sort((a, b) => b.score - a.score);
    const color = (s) => (s >= 60 ? '#059669' : s >= 35 ? '#7c3aed' : '#94a3b8');
    ui.ranked.innerHTML = ranked
      .map(
        (job, i) => `<button class="rjob" data-i="${i}">
          <span class="score" style="background:${color(job.score)}">${job.score}%</span>
          <span><b>${job.title.replace(/[<>&]/g, '')}</b><small>${[job.company, job.salary].filter(Boolean).join(' · ').replace(/[<>&]/g, '')}</small></span>
        </button>`
      )
      .join('');
    ui.ranked.querySelectorAll('.rjob').forEach((btn) =>
      btn.addEventListener('click', () => chrome.tabs.create({ url: ranked[Number(btn.dataset.i)].url }))
    );
    const good = ranked.filter((j) => j.score >= 60).length;
    setStatus(`${jobs.length} jobs found on this page · ${good} strong match${good === 1 ? '' : 'es'}. Click one to open it.`, 'ok');
  } catch (error) {
    ui.ranked.innerHTML = '<span class="muted">Could not read this page. Reload it and try again.</span>';
  } finally {
    ui.rank.disabled = false;
  }
}

// --- screening questions -----------------------------------------------------

let questionFrames = []; // [{frameId, questions}]

async function answerForm() {
  if (!currentTabId) currentTabId = (await getActiveTab())?.id;
  ui.answer.disabled = true;
  ui.fillAnswers.classList.add('hidden');
  ui.qa.innerHTML = '<span class="muted">Reading the questions…</span>';
  try {
    await ensureContentScript(currentTabId);
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTabId, allFrames: true },
      func: () => (window.__jobpilotQuestions ? window.__jobpilotQuestions() : null),
    });
    questionFrames = results.map((r) => ({ frameId: r.frameId, questions: r.result || [] })).filter((f) => f.questions.length);
    const all = questionFrames.flatMap((f) => f.questions.map((q) => ({ ...q, frameId: f.frameId })));
    if (!all.length && results.every((r) => r.result === null)) {
      ui.qa.innerHTML = '<span class="muted">This tab still has the old version loaded. Press F5 to reload the page, then click Answer questions again.</span>';
      return;
    }
    if (!all.length) {
      ui.qa.innerHTML = '<span class="muted">No questions found on this page. Open the step of the application that shows the questions, then try again.</span>';
      return;
    }
    const { profile = {} } = await chrome.storage.local.get('profile');
    if (!profile.summary && !profile.skills) {
      ui.qa.innerHTML = '<span class="muted">Fill in "Your details" first (especially About you), then try again, so the answers are about you.</span>';
      return;
    }
    ui.qa.innerHTML = `<span class="muted">Drafting answers to ${all.length} question(s)…</span>`;
    const response = await chrome.runtime.sendMessage({
      type: 'ANSWER_QUESTIONS',
      questions: all.map(({ id, question, type, options }) => ({ id: id, question, type, options })),
      job: currentJob || {},
    });
    if (!response?.ok) throw new Error(response?.error || 'Could not draft answers.');
    const byId = new Map((response.answers || []).map((a) => [String(a.id), a]));
    ui.qa.innerHTML = all
      .map((q) => {
        const a = byId.get(q.id) || {};
        const safe = (v) => String(v || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
        return `<div><div class="q">${safe(q.question)}</div>
          <textarea data-q="${q.id}" data-frame="${q.frameId}">${safe(a.answer)}</textarea>
          ${a.needs_input ? `<div class="need">Needs you: ${safe(a.needs_input)}</div>` : ''}</div>`;
      })
      .join('');
    ui.fillAnswers.classList.remove('hidden');
    setStatus('Answers drafted. Read and edit them, then fill them in.', 'ok');
  } catch (error) {
    ui.qa.innerHTML = `<span class="muted">${String(error?.message || error)}</span>`;
  } finally {
    ui.answer.disabled = false;
  }
}

async function fillAnswers() {
  const boxes = Array.from(ui.qa.querySelectorAll('textarea[data-q]'));
  const byFrame = new Map();
  boxes.forEach((box) => {
    const frame = Number(box.dataset.frame);
    if (!byFrame.has(frame)) byFrame.set(frame, []);
    byFrame.get(frame).push({ id: box.dataset.q, answer: box.value.trim() });
  });
  let total = 0;
  for (const [frameId, answers] of byFrame) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTabId, frameIds: [frameId] },
      func: (list) => (window.__jobpilotAnswer ? window.__jobpilotAnswer(list) : 0),
      args: [answers],
    });
    total += results.reduce((sum, r) => sum + (r.result || 0), 0);
  }
  setStatus(`Filled ${total} answer(s). Check them on the page, then press Continue/Submit yourself.`, total ? 'ok' : 'error');
}

const chip = (label, cls) => `<span class="chip ${cls}">${label.replace(/[<>&]/g, '')}</span>`;

async function renderJob(job) {
  ui.jobTitle.textContent = job.title;
  ui.jobMeta.textContent = [job.company, job.location].filter(Boolean).join(' · ') || job.source || '';
  ui.jobFacts.innerHTML = [job.salary, job.jobType, job.mode, job.source]
    .filter(Boolean)
    .map((f) => chip(f, 'fact'))
    .join('');

  const { profile = {} } = await chrome.storage.local.get('profile');
  const fit = analyseFit(job, profile);
  ui.fitCard.classList.remove('hidden');
  ui.desc.textContent = job.description || 'No description found on this page.';
  if (!fit.hasSkills) {
    ui.fitScore.textContent = '?';
    ui.fitRing.style.setProperty('--v', 0);
    ui.fitLabel.textContent = 'Add your skills to see your match';
    ui.fitNote.textContent = 'Open "Your details" below and fill in Skills.';
  } else if (fit.score === null) {
    ui.fitScore.textContent = '–';
    ui.fitRing.style.setProperty('--v', 0);
    ui.fitLabel.textContent = 'Not enough detail to score';
    ui.fitNote.textContent = 'Open the full job description and press Re-read page.';
  } else {
    ui.fitScore.textContent = fit.score + '%';
    ui.fitRing.style.setProperty('--v', fit.score);
    ui.fitLabel.textContent = fit.score >= 60 ? 'Good match' : fit.score >= 35 ? 'Partial match' : 'Weak match';
    ui.fitNote.textContent = `${fit.have.length} of ${fit.have.length + fit.gaps.length} skills this job mentions`;
  }
  ui.matched.innerHTML = fit.have.map((t) => chip(t, 'have')).join('') || '<span class="muted">None of your listed skills yet</span>';
  ui.missing.innerHTML = fit.gaps.map((t) => chip(t, 'gap')).join('') || '<span class="muted">Nothing extra</span>';
}

async function readPage() {
  setStatus('Reading the page…');
  currentJob = null;
  ui.draft.disabled = true;
  ui.fill.disabled = true;
  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error('no active tab');
    currentTabId = tab.id;
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' });
    const job = response?.job;
    if (!job || !job.title) {
      ui.fitCard.classList.add('hidden');
      ui.jobFacts.innerHTML = '';
      ui.jobTitle.textContent = 'No job posting detected';
      ui.jobMeta.textContent = 'You can still fill an application form on this page.';
      ui.fill.disabled = false;
      setStatus('');
      return;
    }
    currentJob = job;
    await renderJob(job);
    ui.draft.disabled = false;
    ui.fill.disabled = false;
    setStatus('Ready.', 'ok');
  } catch {
    ui.fill.disabled = true;
    ui.jobTitle.textContent = 'Cannot read this page';
    ui.jobMeta.textContent = 'Reload the job page, then reopen this panel.';
    setStatus('Reload the tab and try again.', 'error');
  }
}

async function draftLetter() {
  if (!currentJob) return;
  ui.draft.disabled = true;
  setStatus('Drafting with Gemini…');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'DRAFT_LETTER', job: currentJob });
    if (response?.ok) {
      ui.letter.value = response.letter;
      ui.copy.disabled = false;
      setStatus('Letter drafted. Review it, then copy or fill the form.', 'ok');
    } else {
      setStatus(response?.error || 'Drafting failed.', 'error');
    }
  } catch (error) {
    setStatus(error?.message || 'Drafting failed.', 'error');
  } finally {
    ui.draft.disabled = false;
  }
}

async function copyLetter() {
  try {
    await navigator.clipboard.writeText(ui.letter.value);
    setStatus('Copied to clipboard.', 'ok');
  } catch {
    ui.letter.select();
    setStatus('Select the text and press Ctrl+C.', 'error');
  }
}

async function fillForm() {
  if (!currentTabId) return;
  const { profile = {}, resume = null } = await chrome.storage.local.get(['profile', 'resume']);
  try {
    await ensureContentScript(currentTabId);
    // Run in every frame and add up the results: many company sites embed the
    // actual form (Greenhouse, Lever, Workday) in an iframe.
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTabId, allFrames: true },
      func: (payload) => (window.__jobpilotFill ? window.__jobpilotFill(payload) : { filled: 0, attached: false }),
      args: [{ ...profile, resume, coverLetter: ui.letter.value }],
    });
    const filled = results.reduce((sum, r) => sum + (r?.result?.filled || 0), 0);
    const attached = results.some((r) => r?.result?.attached) ? ' and attached your resume' : '';
    setStatus(
      filled || attached
        ? `Filled ${filled} field(s)${attached}. Check every field, answer the remaining questions, then press submit.`
        : 'No matching fields on this page. If the form is in a popup, open it first and try again.',
      filled || attached ? 'ok' : 'error'
    );
  } catch {
    setStatus('Could not reach the page. Reload it and try again.', 'error');
  }
}

async function loadProfile() {
  const { profile = {} } = await chrome.storage.local.get('profile');
  ui.name.value = profile.name || '';
  ui.email.value = profile.email || '';
  ui.phone.value = profile.phone || '';
  ui.skills.value = profile.skills || '';
  ui.linkedin.value = profile.linkedin || '';
  ui.roles.value = profile.roles || '';
  ui.summary.value = profile.summary || '';
  ui.city.value = profile.city || '';
  ui.company.value = profile.company || '';
  ui.portfolio.value = profile.portfolio || '';
  const { resume } = await chrome.storage.local.get('resume');
  ui.resumeName.textContent = resume?.name ? `Saved: ${resume.name}` : 'No resume saved yet.';
}

async function saveProfile() {
  const profile = {
    name: ui.name.value.trim(),
    email: ui.email.value.trim(),
    phone: ui.phone.value.trim(),
    skills: ui.skills.value.trim(),
    roles: ui.roles.value.trim(),
    summary: ui.summary.value.trim(),
    linkedin: ui.linkedin.value.trim(),
    city: ui.city.value.trim(),
    company: ui.company.value.trim(),
    portfolio: ui.portfolio.value.trim(),
  };
  await chrome.storage.local.set({ profile });
  setStatus('Details saved.', 'ok');
  if (currentJob) await renderJob(currentJob);
}

ui.draft.addEventListener('click', draftLetter);
ui.rescan.addEventListener('click', readPage);
ui.copy.addEventListener('click', copyLetter);
ui.fill.addEventListener('click', fillForm);
ui.saveProfile.addEventListener('click', saveProfile);
ui.rank.addEventListener('click', rankPage);
ui.answer.addEventListener('click', answerForm);
ui.fillAnswers.addEventListener('click', fillAnswers);
ui.resumeFile.addEventListener('change', () => {
  const file = ui.resumeFile.files && ui.resumeFile.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    setStatus('That file is over 4 MB. Save a smaller PDF and try again.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    await chrome.storage.local.set({ resume: { name: file.name, type: file.type, data: reader.result } });
    ui.resumeName.textContent = `Saved: ${file.name}`;
    setStatus('Resume saved. It is attached when you fill a form.', 'ok');
  };
  reader.readAsDataURL(file);
});
ui.letter.addEventListener('input', () => {
  ui.copy.disabled = !ui.letter.value.trim();
});

loadProfile().then(readPage);
