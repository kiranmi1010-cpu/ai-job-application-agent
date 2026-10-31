// JobPilot Assist — service worker.
//
// Owns the network calls so the popup and content script stay simple: drafting
// a cover letter against the deployed JobPilot API, and caching the profile the
// user fills in for autofill.

const API_BASE = 'https://ai-job-application-agent-pi.vercel.app';

async function draftLetter(job, profile) {
  const resume = {
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    skills: (profile.skills || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    experience: [],
    education: [],
    summary: profile.summary || '',
  };

  const response = await fetch(`${API_BASE}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate-cover-letter', data: { resume, job } }),
  });

  if (!response.ok) {
    return { ok: false, error: `JobPilot API returned HTTP ${response.status}` };
  }

  const body = await response.json();
  if (!body?.success || !body?.data?.body) {
    return { ok: false, error: body?.error || 'The AI returned no letter.' };
  }
  return {
    ok: true,
    letter: body.data.body,
    subject: body.data.subject || `Application for ${job.title} at ${job.company}`,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'DRAFT_LETTER') {
    (async () => {
      try {
        const { profile = {} } = await chrome.storage.local.get('profile');
        sendResponse(await draftLetter(message.job || {}, profile));
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true; // keep the channel open for the async reply
  }
  return false;
});
