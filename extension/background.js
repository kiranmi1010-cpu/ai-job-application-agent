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
  const about = [profile.summary || '', typeof ANSWER_BANK === 'string' && ANSWER_BANK ? `Answer bank (real stories):\n${ANSWER_BANK}` : '']
    .filter(Boolean)
    .join('\n\n');
  return {
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    skills: (profile.skills || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    experience: about
      ? [{ title: 'Experience (in the candidate\'s own words)', company: profile.company || '', duration: '', description: about.slice(0, 6000) }]
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


// --- Direct Gemini (free key from aistudio.google.com) -----------------------
// Used whenever a Gemini key is saved in "Your details", so JP keeps working
// even if the JobPilot server is down.

const GEMINI_MODEL = 'gemini-flash-latest'; // letters and polishing
const GEMINI_FAST = 'gemini-flash-lite-latest'; // quick screening answers

async function gemini(prompt, model = GEMINI_MODEL) {
  const { geminiKey = '' } = await chrome.storage.local.get('geminiKey');
  if (!geminiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini returned HTTP ${response.status}${/API_KEY_INVALID|API key not valid/.test(detail) ? ' (the API key is not valid)' : ''}`);
  }
  const body = await response.json();
  const raw = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim());
}

let ANSWER_BANK = '';
fetch(chrome.runtime.getURL('answer-bank.md')).then((r) => r.text()).then((t) => { ANSWER_BANK = t; }).catch(() => {});

function profileBlock(profile) {
  return [
    `Name: ${profile.name || ''}`,
    `Target roles: ${profile.roles || ''}`,
    `Skills: ${profile.skills || ''}`,
    `City: ${profile.city || ''}`,
    `Current/last company: ${profile.company || ''}`,
    `Current CTC (lakhs): ${profile.currentCtc || ''}`,
    `Expected CTC (lakhs): ${profile.expectedCtc || ''}`,
    `Notice period: ${profile.notice || ''}`,
    `About me (experience, tools, achievements):\n${profile.summary || ''}`,
    ANSWER_BANK ? `\nANSWER BANK (the candidate's real stories; the main source of facts):\n${ANSWER_BANK}` : '',
  ].join('\n');
}

const HONESTY = `Use ONLY facts in the candidate profile. Never invent employers, tools, numbers, degrees or years of experience. If the profile does not cover something, say so honestly in a short, positive way (e.g. "No direct experience yet, but ..."). Write in first person, plain and specific, no filler words like "passionate", "leverage", "excited".`;

async function geminiAnswers(questions, job, profile) {
  const prompt = `You answer screening questions on a job application for the candidate below.
${HONESTY}
Rules:
- "How many years" questions: reply with just a number (decimals allowed), counting only relevant experience from the profile.
- Yes/no questions: start with Yes or No, then at most one short supporting clause.
- For radio/select/checkbox questions, the answer must be exactly one of the given options (for checkbox, options joined with "|").
- Text answers: under 190 characters, one or two sentences, answering exactly what was asked.

Job: ${job?.title || ''} at ${job?.company || ''}
${(job?.description || '').slice(0, 2500)}

Candidate profile:
${profileBlock(profile)}

Questions (JSON): ${JSON.stringify(questions)}

Return JSON: {"answers":[{"id":"<question id>","answer":"<answer>"}]}`;
  let data;
  try {
    data = await gemini(prompt, GEMINI_FAST);
  } catch {
    data = await gemini(prompt); // fall back to the main model if the fast one is unavailable
  }
  return data ? { ok: true, answers: data.answers || [] } : null;
}

async function geminiLetter(job, profile) {
  const prompt = `Write a short cover letter (about 180-220 words) for the candidate below applying to this job.
${HONESTY}
Connect 2-3 of the candidate's real achievements to what the job asks for. No generic opening line.

Job: ${job?.title || ''} at ${job?.company || ''}
${(job?.description || '').slice(0, 3000)}

Candidate profile:
${profileBlock(profile)}

Return JSON: {"subject":"<email subject>","body":"<letter text>"}`;
  const data = await gemini(prompt);
  if (!data) return null;
  return { ok: true, letter: data.body || '', subject: data.subject || `Application for ${job.title} at ${job.company}` };
}

async function geminiPolish(question, draft, profile) {
  const prompt = `The candidate wrote their own answer. Check grammar and suggest only light improvements, keeping their essence, voice and points. Change something only if it is genuinely better. Do not add facts that are not in the draft or the profile.

Question: ${question}
Draft: ${draft}

Candidate profile (for fact-checking only):
${profileBlock(profile)}

Return JSON: {"polished":"<improved answer>","changes":["<each change, short>"],"notes":"<optional one-line tip, or empty>"}`;
  const data = await gemini(prompt);
  return data ? { ok: true, polished: data.polished || draft, changes: data.changes || [], notes: data.notes || '' } : null;
}


// --- Deep check: open each listing, read it, judge the fit --------------------
//
// Opens each job in a background tab, reads the full posting (the card on the
// search page often hides the real experience requirement or pay), closes the
// tab, then asks Gemini for an honest verdict against the candidate's profile.
// It never applies: the candidate opens the good ones and presses Apply.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readListing(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    for (let i = 0; i < 30; i++) {
      const t = await chrome.tabs.get(tab.id);
      if (t.status === 'complete') break;
      await sleep(500);
    }
    await sleep(2000); // let the posting render
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const main = document.querySelector('main') || document.body;
        return { title: document.title, text: (main.innerText || '').replace(/\s+\n/g, '\n').slice(0, 3500) };
      },
    });
    return res?.result || { title: '', text: '' };
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function deepCheck(jobs) {
  const { profile = {} } = await chrome.storage.local.get('profile');
  const list = jobs.slice(0, 12);
  const read = [];
  for (let i = 0; i < list.length; i++) {
    await chrome.storage.local.set({ deepCheck: { status: 'reading', done: i, total: list.length, results: [] } });
    try {
      const page = await readListing(list[i].url);
      read.push({ i, title: list[i].title, company: list[i].company, url: list[i].url, page: page.text });
    } catch (e) {
      read.push({ i, title: list[i].title, company: list[i].company, url: list[i].url, page: list[i].snippet || '' });
    }
  }
  await chrome.storage.local.set({ deepCheck: { status: 'judging', done: list.length, total: list.length, results: [] } });

  const prompt = `You screen job postings for one candidate. Be strict and honest, like a careful career advisor.
For each posting, read the FULL text: the real experience requirement is often in the description, not the header (e.g. a card says "0-1 years" but the description asks for "6+ years"). Check:
- Experience: does the description's real requirement fit the candidate's experience? Count roughly 1.5-2 years of real work.
- Pay: candidate's minimum is ${profile.minPay || '9'} LPA. If pay is shown and the top of the range is below that, it fails. If pay is hidden, say "pay not shown".
- Location: candidate is in ${profile.city || 'Bengaluru'}; a different city only (no Bengaluru option) fails.
- Hard requirements the candidate clearly lacks (e.g. engineering degree, specific licence, language they did not list, industry-only experience).
- Fit with the candidate's target roles and real strengths.
verdict: "good" (apply), "maybe" (stretch, explain), or "skip" (a clear dealbreaker).
reason: one or two plain sentences naming the deciding facts. No filler.

Candidate profile:
${profileBlock(profile)}

Postings (JSON): ${JSON.stringify(read.map(({ i, title, company, page }) => ({ i, title, company, page })))}

Return JSON: {"results":[{"i":0,"verdict":"good|maybe|skip","score":0-100,"pay":"<pay or 'not shown'>","experience":"<real requirement>","reason":"..."}]}`;
  const data = await gemini(prompt);
  if (!data) throw new Error('Add your Gemini API key in "Your details" first.');
  const results = (data.results || []).map((r) => ({ ...r, ...read.find((x) => x.i === r.i), page: undefined }))
    .sort((a, b) => ({ good: 0, maybe: 1, skip: 2 }[a.verdict] - { good: 0, maybe: 1, skip: 2 }[b.verdict]) || (b.score - a.score));
  await chrome.storage.local.set({ deepCheck: { status: 'done', done: list.length, total: list.length, results, at: Date.now() } });
  return results;
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
  if (message?.type === 'DEEP_CHECK') {
    deepCheck(message.jobs || []).catch((error) =>
      chrome.storage.local.set({ deepCheck: { status: 'error', error: error?.message || String(error), results: [] } })
    );
    sendResponse({ ok: true, started: true });
    return true;
  }
  if (message?.type === 'POLISH_ANSWER') {
    (async () => {
      try {
        sendResponse((await geminiPolish(message.question || '', message.draft || '', message.profile || {})) || (await polishAnswer(message.question || '', message.draft || '', message.profile || {})));
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
        sendResponse((await geminiAnswers(message.questions || [], message.job || {}, profile)) || (await answerQuestions(message.questions || [], message.job || {}, profile)));
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
        // The server drafts, then runs an editor pass, in your voice and around
        // your points. If it is unreachable, fall back to direct Gemini.
        let result = null;
        try {
          result = await draftLetter(message.job || {}, profile, message.notes || '');
        } catch (error) {
          result = { ok: false, error: error?.message || String(error) };
        }
        if (!result?.ok) result = (await geminiLetter(message.job || {}, profile).catch(() => null)) || result;
        sendResponse(result);
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
