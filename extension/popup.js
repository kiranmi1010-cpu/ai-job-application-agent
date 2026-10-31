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

async function readPage() {
  setStatus('Reading the page…');
  currentJob = null;
  ui.draft.disabled = true;
  ui.fill.disabled = true;
  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error('no active tab');
    currentTabId = tab.id;
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' });
    const job = response?.job;
    if (!job || !job.title) {
      ui.jobTitle.textContent = 'No supported job page detected';
      ui.jobMeta.textContent = 'Open a posting on LinkedIn, Naukri, Indeed, Glassdoor or Wellfound.';
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
  const { profile = {} } = await chrome.storage.local.get('profile');
  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      type: 'FILL_APPLICATION',
      profile: { ...profile, coverLetter: ui.letter.value },
    });
    const filled = response?.filled || 0;
    setStatus(filled ? `Filled ${filled} field(s). Review before submitting.` : 'No matching fields on this page.', filled ? 'ok' : 'error');
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
}

async function saveProfile() {
  const profile = {
    name: ui.name.value.trim(),
    email: ui.email.value.trim(),
    phone: ui.phone.value.trim(),
    skills: ui.skills.value.trim(),
    linkedin: ui.linkedin.value.trim(),
  };
  await chrome.storage.local.set({ profile });
  setStatus('Details saved.', 'ok');
}

ui.draft.addEventListener('click', draftLetter);
ui.rescan.addEventListener('click', readPage);
ui.copy.addEventListener('click', copyLetter);
ui.fill.addEventListener('click', fillForm);
ui.saveProfile.addEventListener('click', saveProfile);
ui.letter.addEventListener('input', () => {
  ui.copy.disabled = !ui.letter.value.trim();
});

loadProfile().then(readPage);
