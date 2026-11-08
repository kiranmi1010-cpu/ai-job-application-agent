// JobPilot Assist — service worker.
//
// Owns the network calls so the popup and content script stay simple: drafting
// a cover letter against the deployed JobPilot API, and caching the profile the
// user fills in for autofill.

const API_BASE = 'https://ai-job-application-agent-pi.vercel.app';

// The extension only knows what you typed into "Your details", so turn that
// into the resume shape the API expects. "About you" is passed as experience,
// not just a summary, so the writer has real material to work with.
function profileToResume(profile) {
  const about = profile.summary || '';
  return {
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    skills: (profile.skills || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    experience: about
      ? [{ title: 'Experience (in the candidate\'s own words)', company: profile.company || '', duration: '', description: about.slice(0, 3000) }]
      : [],
    education: [],
    summary: [profile.roles ? `Looking for: ${profile.roles}.` : '', profile.city ? `Based in ${profile.city}.` : '']
      .filter(Boolean)
      .join(' '),
  };
}

function profileToPreferences(profile) {
  return {
    desiredRoles: profile.roles || '',
    locationPreference: profile.locationPreference || profile.city || '',
    languages: profile.languages || '',
  };
}

async function callApi(action, data) {
  const response = await fetch(`${API_BASE}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.details || body?.error || `JobPilot API returned HTTP ${response.status}`);
  }
  return response.json();
}

async function draftLetter(job, profile, notes) {
  const body = await callApi('generate-cover-letter', {
    resume: profileToResume(profile),
    job,
    notes: notes || '',
    voice: profile.voice || '',
    preferences: profileToPreferences(profile),
  });
  if (!body?.success || !body?.data?.body) {
    return { ok: false, error: body?.error || 'The AI returned no letter.' };
  }
  return {
    ok: true,
    letter: body.data.body,
    subject: body.data.subject || `Application for ${job.title} at ${job.company}`,
    stretches: body.data.stretches || [],
    changes: body.data.changes || [],
  };
}

// AI fit check for the floating launcher. Cached per job so browsing back and
// forth does not spend free-tier requests twice.
async function fitCheck(job, profile) {
  if (!profile.skills && !profile.summary) return { ok: false, needsProfile: true };
  const key = `${job.title}|${job.company}`.toLowerCase();
  const { fitCache = {} } = await chrome.storage.local.get('fitCache');
  const hit = fitCache[key];
  if (hit && Date.now() - hit.at < 7 * 24 * 3600 * 1000) return { ok: true, fit: hit.fit, cached: true };

  const body = await callApi('analyze-job-fit', {
    resume: profileToResume(profile),
    job,
    preferences: profileToPreferences(profile),
  });
  if (!body?.success || !body?.data) return { ok: false, error: body?.error || 'no result' };
  const d = body.data;
  const fit = {
    matchScore: d.matchScore,
    verdict: d.verdict,
    advice: d.advice,
    summary: d.summary,
    strengths: (d.strengths || []).slice(0, 3),
    gaps: (d.gaps || []).slice(0, 3),
    gates: d.gates,
    postingFlags: d.postingFlags || [],
  };
  const entries = Object.entries({ ...fitCache, [key]: { at: Date.now(), fit } })
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 200);
  await chrome.storage.local.set({ fitCache: Object.fromEntries(entries) });
  return { ok: true, fit };
}

async function answerQuestions(questions, job, profile) {
  const response = await fetch(`${API_BASE}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'answer-questions', data: { profile, questions, job } }),
  });
  if (!response.ok) return { ok: false, error: `JobPilot API returned HTTP ${response.status}` };
  const body = await response.json();
  if (!body?.success) return { ok: false, error: body?.error || 'The AI returned no answers.' };
  return { ok: true, answers: body.data?.answers || [] };
}

async function polishAnswer(question, draft, profile) {
  const response = await fetch(`${API_BASE}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'polish-answer', data: { question, draft, profile } }),
  });
  if (!response.ok) return { ok: false, error: `JobPilot API returned HTTP ${response.status}` };
  const body = await response.json();
  if (!body?.success) return { ok: false, error: body?.error || 'Could not polish.' };
  return { ok: true, ...body.data };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FIT_CHECK') {
    (async () => {
      try {
        const { profile = {} } = await chrome.storage.local.get('profile');
        sendResponse(await fitCheck(message.job || {}, profile));
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }
  if (message?.type === 'POLISH_ANSWER') {
    (async () => {
      try {
        sendResponse(await polishAnswer(message.question || '', message.draft || '', message.profile || {}));
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }
  if (message?.type === 'ANSWER_QUESTIONS') {
    (async () => {
      try {
        const { profile = {} } = await chrome.storage.local.get('profile');
        sendResponse(await answerQuestions(message.questions || [], message.job || {}, profile));
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }
  if (message?.type === 'DRAFT_LETTER') {
    (async () => {
      try {
        const { profile = {} } = await chrome.storage.local.get('profile');
        sendResponse(await draftLetter(message.job || {}, profile, message.notes || ''));
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true; // keep the channel open for the async reply
  }
  return false;
});

// Alt+J opens or closes the in-page panel.
chrome.commands?.onCommand.addListener(async (command) => {
  if (command !== 'toggle-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' }).catch(() => {});
});
