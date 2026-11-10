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
  currentCtc: el('currentCtc'),
  expectedCtc: el('expectedCtc'),
  notice: el('notice'),
  autoChat: el('autoChat'),
  geminiKey: el('geminiKey'),
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
  deep: el('deepBtn'),
  deepOut: el('deep'),
  minPay: el('minPay'),
  notes: el('notes'),
  voice: el('voice'),
  languages: el('languages'),
  autoPop: el('autoPop'),
  autoFit: el('autoFit'),
  aiFit: el('aiFit'),
  stretches: el('stretches'),
};

// Opened inside the page by the floating launcher (an iframe), rather than
// from the toolbar icon.
const EMBEDDED = new URLSearchParams(location.search).has('embedded');
if (EMBEDDED) document.body.classList.add('embedded');

let currentJob = null;
let currentTabId = null;

function setStatus(message, kind) {
  ui.status.textContent = message || '';
  ui.status.className = 'status' + (kind ? ' ' + kind : '');
}

async function getActiveTab() {
  if (EMBEDDED) {
    const own = await chrome.tabs.getCurrent().catch(() => null);
    if (own?.id) return own;
  }
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
    lastRanked = ranked;
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
        return `<div class="qitem"><div class="q">${safe(q.question)}</div>
          <textarea data-q="${q.id}" data-frame="${q.frameId}">${safe(a.answer)}</textarea>
          ${a.needs_input ? `<div class="need">Needs you: ${safe(a.needs_input)}</div>` : ''}
          <div class="qtools"><button class="ghost polish" type="button">Polish my draft</button><button class="ghost undo hidden" type="button">Undo</button></div>
          <div class="changes"></div></div>`;
      })
      .join('');
    ui.fillAnswers.classList.remove('hidden');
    bindPolishButtons(ui.qa, all);
    setStatus('Drafts ready. Rewrite any answer in your own words, then press "Polish my draft" to clean it up.', 'ok');
  } catch (error) {
    ui.qa.innerHTML = `<span class="muted">${String(error?.message || error)}</span>`;
  } finally {
    ui.answer.disabled = false;
  }
}

// Your way of writing: you write it, AI checks grammar and suggests light
// improvements while keeping your essence. Each change is listed, and Undo
// brings your own version back.
async function polishText(question, draft) {
  const { profile = {} } = await chrome.storage.local.get('profile');
  return chrome.runtime.sendMessage({ type: 'POLISH_ANSWER', question, draft, profile });
}

function bindPolishButtons(root, questions) {
  root.querySelectorAll('.qitem').forEach((item, i) => {
    const box = item.querySelector('textarea');
    const polish = item.querySelector('.polish');
    const undo = item.querySelector('.undo');
    const changes = item.querySelector('.changes');
    let original = '';
    polish.addEventListener('click', async () => {
      if (!box.value.trim()) {
        changes.textContent = 'Write your answer in the box first.';
        return;
      }
      polish.disabled = true;
      polish.textContent = 'Polishing…';
      original = box.value;
      try {
        const res = await polishText(questions[i]?.question || '', box.value);
        if (!res?.ok) throw new Error(res?.error || 'Could not polish.');
        box.value = res.polished;
        const list = (res.changes || []).map((c) => '• ' + c).join('\n');
        changes.textContent = [list || 'No changes needed.', res.notes ? 'Tip: ' + res.notes : ''].filter(Boolean).join('\n');
        undo.classList.remove('hidden');
      } catch (error) {
        changes.textContent = String(error?.message || error);
      } finally {
        polish.disabled = false;
        polish.textContent = 'Polish my draft';
      }
    });
    undo.addEventListener('click', () => {
      box.value = original;
      changes.textContent = 'Back to your version.';
      undo.classList.add('hidden');
    });
  });
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
  showAiFit(job);
  ui.matched.innerHTML = fit.have.map((t) => chip(t, 'have')).join('') || '<span class="muted">None of your listed skills yet</span>';
  ui.missing.innerHTML = fit.gaps.map((t) => chip(t, 'gap')).join('') || '<span class="muted">Nothing extra</span>';
}

const escHtml = (v) => String(v ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

async function showAiFit(job) {
  ui.aiFit.classList.remove('hidden', 'fail');
  ui.aiFit.textContent = 'AI fit check running…';
  try {
    const result = await chrome.runtime.sendMessage({ type: 'FIT_CHECK', job });
    if (currentJob && currentJob.title !== job.title) return;
    if (!result?.ok) {
      ui.aiFit.textContent = result?.needsProfile
        ? 'Fill in "Your details" below to get an AI fit check.'
        : `AI fit check unavailable: ${result?.error || 'no response'}`;
      return;
    }
    const f = result.fit;
    const failed = f.verdict === 'Do not apply';
    if (failed) ui.aiFit.classList.add('fail');
    const flags = (f.postingFlags || []).length
      ? `<div style="margin-top:4px;color:#b91c1c">⚠ This posting has hidden text or AI instructions. They were ignored; check it is genuine.</div>`
      : '';
    ui.aiFit.innerHTML = `<b>AI fit: ${failed ? 'skip' : escHtml(f.matchScore) + '/100'} · ${escHtml(f.verdict)}</b>
      <div>${escHtml(f.advice || '')}</div>
      ${f.strengths?.length ? `<div style="margin-top:4px">+ ${f.strengths.map(escHtml).join('<br>+ ')}</div>` : ''}
      ${f.gaps?.length ? `<div style="margin-top:4px">− ${f.gaps.map(escHtml).join('<br>− ')}</div>` : ''}${flags}`;
  } catch (error) {
    ui.aiFit.textContent = `AI fit check unavailable: ${error?.message || error}`;
  }
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
  setStatus('Drafting, then editing… (about 15 seconds)');
  ui.stretches.innerHTML = '';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'DRAFT_LETTER', job: currentJob, notes: ui.notes.value.trim() });
    if (response?.ok) {
      ui.letter.value = response.letter;
      if (response.stretches?.length) {
        ui.stretches.innerHTML = `<div class="stretch"><b>Check before sending, these stretch your experience:</b><br>• ${response.stretches
          .map(escHtml)
          .join('<br>• ')}<br>Keep, soften or drop each one.</div>`;
      }
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
  ui.voice.value = profile.voice || '';
  ui.languages.value = profile.languages || '';
  const { launcher = {} } = await chrome.storage.local.get('launcher');
  ui.autoPop.checked = launcher.autoPop !== false;
  ui.autoFit.checked = launcher.autoFit !== false;
  ui.currentCtc.value = profile.currentCtc || '';
  ui.expectedCtc.value = profile.expectedCtc || '';
  ui.notice.value = profile.notice || '';
  ui.minPay.value = profile.minPay || '';
  ui.autoChat.checked = profile.autoChat !== false;
  const { geminiKey = '' } = await chrome.storage.local.get('geminiKey');
  ui.geminiKey.value = geminiKey;
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
    currentCtc: ui.currentCtc.value.trim(),
    expectedCtc: ui.expectedCtc.value.trim(),
    notice: ui.notice.value.trim(),
    minPay: ui.minPay.value.trim(),
    autoChat: ui.autoChat.checked,
    voice: ui.voice.value.trim(),
    languages: ui.languages.value.trim(),
  };
  try {
    await chrome.storage.local.set({
      profile,
      geminiKey: ui.geminiKey.value.trim(),
      launcher: { autoPop: ui.autoPop.checked, autoFit: ui.autoFit.checked },
    });
  } catch (error) {
    ui.saveProfile.textContent = 'Could not save: ' + (error?.message || error);
    return;
  }
  setStatus('Details saved.', 'ok');
  // The status line sits at the top of the panel; confirm on the button too,
  // which is the part you can see after scrolling down to it.
  ui.saveProfile.textContent = 'Saved ✓';
  ui.saveProfile.style.borderColor = '#10b981';
  ui.saveProfile.style.color = '#047857';
  setTimeout(() => {
    ui.saveProfile.textContent = 'Save details';
    ui.saveProfile.style.borderColor = '';
    ui.saveProfile.style.color = '';
  }, 2500);
  if (currentJob) await renderJob(currentJob);
}

ui.draft.addEventListener('click', draftLetter);
ui.rescan.addEventListener('click', readPage);
ui.copy.addEventListener('click', copyLetter);
ui.fill.addEventListener('click', fillForm);
ui.saveProfile.addEventListener('click', saveProfile);
ui.rank.addEventListener('click', rankPage);

let lastRanked = [];
const esc = (v) => String(v || '').replace(/[<>&"]/g, '');

function renderDeep(state) {
  if (!state) return;
  if (state.status === 'reading') {
    ui.deepOut.innerHTML = `<span class="muted">Reading job ${state.done + 1} of ${state.total} (opening each one in the background)…</span>`;
  } else if (state.status === 'judging') {
    ui.deepOut.innerHTML = '<span class="muted">Checking experience, pay and fit…</span>';
  } else if (state.status === 'error') {
    ui.deepOut.innerHTML = `<span class="muted">Could not finish: ${esc(state.error)}</span>`;
  } else if (state.status === 'done') {
    const col = { good: '#059669', maybe: '#d97706', skip: '#94a3b8' };
    const label = { good: 'Apply', maybe: 'Maybe', skip: 'Skip' };
    ui.deepOut.innerHTML = state.results.map((r, i) => `<button class="rjob" data-u="${esc(r.url)}" title="${esc(r.reason)}">
        <span class="score" style="background:${col[r.verdict] || '#94a3b8'}">${label[r.verdict] || '?'}</span>
        <span><b>${esc(r.title)}</b><small>${esc([r.company, r.pay, r.experience].filter(Boolean).join(' · '))}</small><small>${esc(r.reason)}</small></span>
      </button>`).join('');
    ui.deepOut.querySelectorAll('.rjob').forEach((b) => b.addEventListener('click', () => chrome.tabs.create({ url: b.dataset.u })));
    const good = state.results.filter((r) => r.verdict === 'good').length;
    setStatus(`Deep check done: ${good} worth applying to. Open one, click Apply, and JP fills the questions.`, 'ok');
  }
}

async function deepCheckPage() {
  if (!lastRanked.length) await rankPage();
  if (!lastRanked.length) return;
  const jobs = lastRanked.filter((j) => j.score >= 30).slice(0, 12);
  const pick = jobs.length ? jobs : lastRanked.slice(0, 12);
  ui.deep.disabled = true;
  await chrome.runtime.sendMessage({ type: 'DEEP_CHECK', jobs: pick });
  renderDeep({ status: 'reading', done: 0, total: pick.length });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.deepCheck) {
    renderDeep(changes.deepCheck.newValue);
    if (['done', 'error'].includes(changes.deepCheck.newValue?.status)) ui.deep.disabled = false;
  }
});
chrome.storage.local.get('deepCheck').then(({ deepCheck }) => {
  renderDeep(deepCheck);
  if (deepCheck && !['done', 'error'].includes(deepCheck.status)) ui.deep.disabled = true;
});
ui.deep.addEventListener('click', deepCheckPage);

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

// The launcher asks the embedded panel to re-read when it is reopened.
window.addEventListener('message', (event) => {
  if (event.data?.type === 'JOBPILOT_REREAD') readPage();
});

loadProfile().then(readPage);
