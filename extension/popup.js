// JobPilot Assist — popup logic.

const el = (id) => document.getElementById(id);

const ui = {
  jobTitle: el('jobTitle'),
  jobMeta: el('jobMeta'),
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
      ui.jobTitle.textContent = 'No job posting detected';
      ui.jobMeta.textContent = 'You can still fill an application form on this page.';
      ui.fill.disabled = false;
      setStatus('');
      return;
    }
    currentJob = job;
    ui.jobTitle.textContent = job.title;
    ui.jobMeta.textContent = [job.company, job.location, job.source].filter(Boolean).join(' · ');
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
    linkedin: ui.linkedin.value.trim(),
    city: ui.city.value.trim(),
    company: ui.company.value.trim(),
    portfolio: ui.portfolio.value.trim(),
  };
  await chrome.storage.local.set({ profile });
  setStatus('Details saved.', 'ok');
}

ui.draft.addEventListener('click', draftLetter);
ui.rescan.addEventListener('click', readPage);
ui.copy.addEventListener('click', copyLetter);
ui.fill.addEventListener('click', fillForm);
ui.saveProfile.addEventListener('click', saveProfile);
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
