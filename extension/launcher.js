// JobPilot Assist — floating launcher.
//
// Runs in the top frame of job boards and careers pages. When it detects a job
// posting or an application form, it shows a floating JobPilot button and (once
// per page) pops a small card with the job, an AI fit check, and an "Open"
// button. Opening shows the full JobPilot panel inside the page, so there is no
// need to click the toolbar icon. Nothing is filled or submitted on its own.
//
// Everything lives in a closed shadow root so the site's CSS cannot break it and
// the site's scripts cannot read it.

if (window.top === window && window.__jobpilotLauncher !== '1.9.2') {
  window.__jobpilotLauncher = '1.9.2';

  const DEFAULTS = { autoPop: true, autoFit: true, autoFill: true };
  const host = document.createElement('div');
  host.id = 'jobpilot-launcher-host';
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483646; right: 0; bottom: 0; width: 0; height: 0;';
  const root = host.attachShadow({ mode: 'closed' });

  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
      .fab {
        position: fixed; right: 20px; bottom: 22px; width: 54px; height: 54px; border-radius: 50%;
        border: none; cursor: pointer; padding: 0;
        background: radial-gradient(circle at 35% 30%, #8a5fe0 0%, #3b2470 55%, #1a1230 100%);
        box-shadow: 0 0 0 3px rgba(138, 95, 224, .35), 0 8px 24px rgba(26, 18, 48, .45);
        display: none; align-items: center; justify-content: center; transition: transform .15s;
      }
      .fab:hover { transform: scale(1.07); }
      .fab.show { display: flex; }
      .fab .ring { position: absolute; inset: -6px; border-radius: 50%; border: 2px solid rgba(167, 139, 250, .55);
        animation: pulse 2.4s ease-out infinite; }
      @keyframes pulse { 0% { transform: scale(.9); opacity: .9 } 100% { transform: scale(1.35); opacity: 0 } }
      .fab .label { color: #f4efff; font: 800 15px/1 ui-sans-serif, system-ui; letter-spacing: .5px; }
      .fab .badge { position: absolute; top: -6px; right: -8px; min-width: 26px; padding: 3px 5px; border-radius: 10px;
        font: 700 11px/1 ui-sans-serif, system-ui; color: white; background: #64748b; display: none; text-align: center; }
      .badge.good { background: #059669 } .badge.mid { background: #d97706 } .badge.bad { background: #dc2626 }
      .toast {
        position: fixed; right: 20px; bottom: 88px; width: 310px; background: #fff; color: #0f172a;
        border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 16px 40px rgba(15, 23, 42, .25);
        overflow: hidden; display: none; animation: rise .2s ease-out;
      }
      @keyframes rise { from { transform: translateY(10px); opacity: 0 } to { transform: none; opacity: 1 } }
      .toast.show { display: block; }
      .toast header { padding: 10px 12px; background: radial-gradient(circle at 30% 0%, #5b3aa8 0%, #1a1230 70%); color: #f4efff;
        display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; }
      .toast header button { background: none; border: none; color: #f4efff; font-size: 16px; cursor: pointer; line-height: 1; }
      .toast .body { padding: 10px 12px 12px; font-size: 12.5px; line-height: 1.45; }
      .title { font-weight: 700; font-size: 13.5px; margin: 0 0 2px; }
      .meta { color: #64748b; margin: 0 0 8px; font-size: 12px; }
      .fit { padding: 8px 10px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 10px; }
      .fit b { font-size: 14px; }
      .fit .why { color: #475569; margin-top: 3px; }
      .fit.fail { background: #fef2f2; border-color: #fecaca; }
      .actions { display: flex; gap: 8px; }
      .actions button { flex: 1; padding: 8px 10px; border-radius: 9px; font: 700 12px/1 ui-sans-serif, system-ui; cursor: pointer; }
      .primary { background: linear-gradient(180deg, #8a5fe0, #3b2470); color: #fff; border: none; }
      .ghost { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
      .auto { position: fixed; right: 20px; bottom: 88px; width: 320px; background: #fff; color: #0f172a;
        border-radius: 14px; border: 1px solid #ddd6fe; box-shadow: 0 16px 40px rgba(15, 23, 42, .25); overflow: hidden; display: none; }
      .auto.show { display: block; }
      .auto header { padding: 9px 12px; background: radial-gradient(circle at 30% 0%, #5b3aa8 0%, #1a1230 70%); color: #f4efff;
        display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; }
      .auto header button { background: none; border: none; color: #f4efff; font-size: 16px; cursor: pointer; }
      .auto .body { padding: 10px 12px 12px; font-size: 12.5px; line-height: 1.45; }
      .auto .state { padding: 8px 10px; border-radius: 10px; background: #f5f3ff; border: 1px solid #ddd6fe; margin: 6px 0 10px; color: #3b0764; }
      .auto .state.done { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
      .auto .actions { flex-wrap: wrap; }
      .auto .actions button { flex: 1 1 45%; }
      .panel {
        position: fixed; top: 12px; right: 12px; bottom: 12px; width: 400px; max-width: calc(100vw - 24px);
        background: #f8fafc; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, .35);
        overflow: hidden; display: none; border: 1px solid #e2e8f0;
      }
      .panel.show { display: block; }
      .panel iframe { width: 100%; height: 100%; border: 0; display: block; }
      .panel .close { position: absolute; top: 10px; right: 12px; z-index: 2; width: 26px; height: 26px; border-radius: 50%;
        border: none; background: rgba(255,255,255,.18); color: #fff; font-size: 16px; cursor: pointer; }
    </style>
    <button class="fab" title="JobPilot"><span class="ring"></span><span class="label">JP</span><span class="badge"></span></button>
    <div class="toast" role="dialog" aria-label="JobPilot">
      <header><span>JobPilot spotted a job</span><button class="x" title="Dismiss">×</button></header>
      <div class="body">
        <p class="title"></p>
        <p class="meta"></p>
        <div class="fit"></div>
        <div class="actions">
          <button class="primary open">Open JobPilot</button>
          <button class="ghost later">Not now</button>
        </div>
      </div>
    </div>
    <div class="auto" role="dialog" aria-label="JP Autopilot">
      <header><span class="a-head">JP Autopilot</span><button class="a-x" title="Hide">×</button></header>
      <div class="body">
        <p class="title a-title"></p>
        <p class="meta a-meta"></p>
        <div class="state a-state"></div>
        <div class="actions">
          <button class="primary a-applied">✓ I applied, next job</button>
          <button class="ghost a-skip">Skip, next job</button>
          <button class="ghost a-fill">Fill again</button>
          <button class="ghost a-stop">Stop autopilot</button>
        </div>
      </div>
    </div>
    <div class="panel"><button class="close" title="Close">×</button></div>
  `;

  const $ = (sel) => root.querySelector(sel);
  const fab = $('.fab');
  const badge = $('.badge');
  const toast = $('.toast');
  const panel = $('.panel');
  let iframe = null;
  let lastUrl = '';
  let hideTimer = null;
  let current = null;

  const esc = (v) => String(v || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  async function settings() {
    try {
      const { launcher = {} } = await chrome.storage.local.get('launcher');
      return { ...DEFAULTS, ...launcher };
    } catch {
      return DEFAULTS;
    }
  }

  function openPanel() {
    hideToast();
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL('popup.html?embedded=1');
      iframe.allow = 'clipboard-write';
      panel.appendChild(iframe);
    } else {
      // Re-read the page each time it opens, in case the job changed.
      iframe.contentWindow?.postMessage({ type: 'JOBPILOT_REREAD' }, '*');
    }
    panel.classList.add('show');
  }

  function closePanel() {
    panel.classList.remove('show');
  }

  function hideToast() {
    toast.classList.remove('show');
    clearTimeout(hideTimer);
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideToast, 15000);
  }

  function setBadge(score, failed) {
    if (score == null) {
      badge.style.display = 'none';
      return;
    }
    badge.textContent = failed ? '✕' : String(score);
    badge.className = 'badge ' + (failed ? 'bad' : score >= 60 ? 'good' : score >= 45 ? 'mid' : 'bad');
    badge.style.display = 'block';
  }

  function renderFit(state) {
    const box = $('.fit');
    box.className = 'fit';
    if (state === 'loading') {
      box.innerHTML = 'Checking how well this fits you…';
      return;
    }
    if (!state || state.error) {
      box.innerHTML = state?.needsProfile
        ? 'Open JobPilot and fill in <b>Your details</b> once to get an AI fit check on every job.'
        : `Fit check unavailable${state?.error ? `: ${esc(state.error)}` : ''}.`;
      return;
    }
    const failed = state.verdict === 'Do not apply';
    if (failed) box.classList.add('fail');
    box.innerHTML = `<b>${failed ? 'Skip' : esc(state.matchScore) + '/100'}</b> · ${esc(state.verdict)}
      <div class="why">${esc(state.advice || state.summary || '')}</div>`;
    setBadge(state.matchScore, failed);
  }

  const isShown = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };

  // An application form: a resume upload, or a contact field (email / phone)
  // alongside several other fields. A lone search box does not count.
  function looksLikeApplication() {
    const resumeUpload = Array.from(document.querySelectorAll('input[type="file"]')).some((input) =>
      /resume|cv\b|curriculum/i.test(
        [input.name, input.id, input.getAttribute('aria-label'), (input.closest('label, div, section') || {}).textContent]
          .join(' ')
          .slice(0, 400)
      )
    );
    if (resumeUpload) return true;
    const contact = Array.from(
      document.querySelectorAll('input[type="email"], input[type="tel"], input[autocomplete="email"], input[name*="email" i], input[name*="phone" i]')
    ).filter(isShown);
    if (!contact.length) return false;
    const fields = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="search"]), textarea, select')).filter(isShown);
    return fields.length >= 4;
  }

  async function detect() {
    let job = null;
    try {
      job = typeof window.__jobpilotExtract === 'function' ? window.__jobpilotExtract() : null;
    } catch {}
    return { job: job && job.title ? job : null, isForm: looksLikeApplication() };
  }

  async function onPage() {
    const url = location.href;
    if (url === lastUrl) return;
    lastUrl = url;
    hideToast();
    setBadge(null);
    lastEmpty = -1;
    filledHere = false;
    markedHere = false;
    clearTimeout(nextTimer);
    await refreshQueue();
    const onQueuedJob = !!openItem();

    const { job, isForm } = await detect();
    current = job;
    if (!job && !isForm && !onQueuedJob) {
      fab.classList.remove('show');
      auto.classList.remove('show');
      return;
    }
    fab.classList.add('show');
    if (onQueuedJob) {
      showAuto();
      autoSet(isForm ? 'Application form found.' : 'Press <b>Apply</b> / <b>Easy Apply</b>. JP fills the form as soon as it opens.');
    }

    const prefs = await settings();
    const key = job ? `${job.title}|${job.company}` : url;
    const { popped = [] } = await chrome.storage.local.get('popped').catch(() => ({ popped: [] }));
    const alreadyPopped = popped.includes(key);

    $('.title').textContent = job ? job.title : 'Application form';
    $('.meta').textContent = job ? [job.company, job.location].filter(Boolean).join(' · ') : 'JobPilot can answer the questions and fill this form.';
    $('.toast header span').textContent = job ? 'JobPilot spotted a job' : 'JobPilot can fill this form';

    if (isForm && prefs.autoFill) runFill();

    if (prefs.autoPop && !alreadyPopped && !onQueuedJob && !isForm) {
      toast.classList.add('show');
      scheduleHide();
      chrome.storage.local.set({ popped: [key, ...popped].slice(0, 300) }).catch(() => {});
    }

    if (job && prefs.autoFit) {
      renderFit('loading');
      try {
        const result = await chrome.runtime.sendMessage({ type: 'FIT_CHECK', job });
        if (location.href !== url) return;
        renderFit(result?.ok ? result.fit : result);
      } catch (error) {
        renderFit({ error: error?.message || 'extension reloaded, refresh the page' });
      }
    } else if (!job) {
      $('.fit').innerHTML = 'Open JobPilot, then use <b>Answer questions</b> and <b>Fill application form</b>.';
    } else {
      $('.fit').innerHTML = 'Open JobPilot to check your fit and draft a letter.';
    }
  }


  // --- Autopilot -------------------------------------------------------------
  // Fills every application form it sees (each step of a multi-step form too),
  // never presses a button. When the site says the application went through,
  // the job is marked applied and the next queued job opens.
  const auto = $('.auto');
  const ATS_FRAME = /greenhouse|lever\.co|myworkday|ashbyhq|smartrecruiters|workable|icims|zohorecruit|keka|darwinbox|freshteam|successfactors|taleo/i;
  const APPLIED_TEXT = /application (?:was |has been )?(?:sent|submitted|received)|thank(?:s| you) for (?:applying|your application)|successfully applied|applied successfully|you(?:'|’)ve applied/i;
  let autoState = { current: '', queue: [] };
  let filling = false;
  let lastEmpty = -1;
  let filledHere = false;
  let markedHere = false;
  let nextTimer = null;

  const autoSet = (html, done = false) => {
    const box = $('.a-state');
    box.innerHTML = html;
    box.classList.toggle('done', done);
  };

  function emptyCount() {
    const fields = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="search"]):not([type="submit"]):not([type="button"]), textarea, select')).filter(isShown);
    const empty = fields.filter((f) => (f.type === 'radio' || f.type === 'checkbox' ? false : !String(f.value || '').trim())).length;
    const frames = Array.from(document.querySelectorAll('iframe')).filter((f) => ATS_FRAME.test(f.src || '')).length;
    return empty + frames;
  }

  const hasForm = () => looksLikeApplication() || Array.from(document.querySelectorAll('iframe')).some((f) => ATS_FRAME.test(f.src || ''));

  async function refreshQueue() {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'QUEUE_STATE' });
      if (r?.ok) autoState = r;
    } catch {}
    return autoState;
  }

  const openItem = () => autoState.queue.find((q) => q.url === autoState.current && q.status === 'open');

  function showAuto() {
    const item = openItem();
    const total = autoState.queue.filter((q) => ['queued', 'open'].includes(q.status) || (q.status !== 'queued' && q.at > Date.now() - 12 * 3600e3)).length;
    const doneCount = autoState.queue.filter((q) => ['applied', 'skipped'].includes(q.status) && q.at > Date.now() - 12 * 3600e3).length;
    $('.a-head').textContent = item ? `JP Autopilot · job ${doneCount + 1} of ${total}` : 'JP filled this form';
    $('.a-title').textContent = item?.title || current?.title || document.title.slice(0, 80);
    $('.a-meta').textContent = item ? [item.company, item.reason].filter(Boolean).join(' · ') : 'Check the answers, then press Apply / Submit yourself.';
    $('.a-skip').style.display = item ? '' : 'none';
    $('.a-stop').style.display = item ? '' : 'none';
    $('.a-applied').textContent = item ? '✓ I applied, next job' : '✓ I applied (log it)';
    hideToast();
    auto.classList.add('show');
  }

  async function runFill() {
    if (filling) return;
    filling = true;
    showAuto();
    autoSet('Filling your details, resume and answers…');
    try {
      const r = await chrome.runtime.sendMessage({ type: 'AUTOFILL', job: { ...(current || {}), url: openItem()?.url || location.href } });
      if (!r?.ok) {
        autoSet(esc(r?.error || 'Could not fill this form.'));
      } else {
        filledHere = true;
        const parts = [
          r.filled && `${r.filled} detail(s)`,
          r.attached && 'resume attached',
          r.answered && `${r.answered} answer(s)`,
          r.letter && 'cover letter',
        ].filter(Boolean);
        const needs = (r.needs || []).slice(0, 3).map((q) => `<br>• ${esc(q)}`).join('');
        autoSet(
          (parts.length ? `<b>Filled:</b> ${parts.join(', ')}.` : 'Nothing new to fill on this step.') +
            (needs ? `<br><b>Needs you:</b>${needs}` : '') +
            '<br>Check it, then press <b>Next / Apply / Submit</b> yourself.',
          !needs
        );
      }
    } catch (error) {
      autoSet('Extension was updated: refresh this page (F5).');
    } finally {
      lastEmpty = emptyCount();
      filling = false;
    }
  }

  async function goNext(status) {
    clearTimeout(nextTimer);
    await chrome.runtime.sendMessage({ type: 'QUEUE_MARK', status, job: { ...(current || {}), url: location.href } }).catch(() => {});
    await refreshQueue();
    if (!autoState.queue.some((q) => q.status === 'queued')) {
      autoSet('That was the last job in the queue. 🎉 Run a Deep check on a search page to fill it again.', true);
      $('.a-head').textContent = 'JP Autopilot · queue done';
      return;
    }
    autoSet('Opening the next job…');
    chrome.runtime.sendMessage({ type: 'QUEUE_NEXT' }).catch(() => {});
  }

  function checkApplied() {
    if (markedHere || !(filledHere || openItem())) return;
    const textNow = (document.body?.innerText || '').slice(0, 20000);
    if (!APPLIED_TEXT.test(textNow)) return;
    markedHere = true;
    showAuto();
    if (!openItem()) {
      chrome.runtime.sendMessage({ type: 'QUEUE_MARK', status: 'applied', job: { ...(current || {}), url: location.href } }).catch(() => {});
      autoSet('Applied ✓ Logged in your tracker.', true);
      return;
    }
    autoSet('Applied ✓ Opening the next job in 5 seconds… <a href="#" class="a-cancel">stay here</a>', true);
    $('.a-cancel')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearTimeout(nextTimer);
      autoSet('Staying on this page. Press "next job" when ready.', true);
    });
    nextTimer = setTimeout(() => goNext('applied'), 5000);
  }

  let watchPending = false;
  new MutationObserver(() => {
    if (watchPending) return;
    watchPending = true;
    setTimeout(async () => {
      watchPending = false;
      const prefs = await settings();
      if (prefs.autoFill && !filling && hasForm()) {
        const empty = emptyCount();
        if (empty > lastEmpty) runFill();
      }
      checkApplied();
    }, 1500);
  }).observe(document.documentElement, { childList: true, subtree: true });

  $('.a-applied').addEventListener('click', () => {
    markedHere = true;
    if (openItem()) goNext('applied');
    else {
      chrome.runtime.sendMessage({ type: 'QUEUE_MARK', status: 'applied', job: { ...(current || {}), url: location.href } }).catch(() => {});
      autoSet('Logged as applied ✓', true);
    }
  });
  $('.a-skip').addEventListener('click', () => goNext('skipped'));
  $('.a-fill').addEventListener('click', runFill);
  $('.a-x').addEventListener('click', () => auto.classList.remove('show'));
  $('.a-stop').addEventListener('click', async () => {
    clearTimeout(nextTimer);
    await chrome.runtime.sendMessage({ type: 'QUEUE_MARK', status: 'queued' }).catch(() => {});
    auto.classList.remove('show');
  });

  fab.addEventListener('click', () => (panel.classList.contains('show') ? closePanel() : openPanel()));
  $('.open').addEventListener('click', openPanel);
  $('.later').addEventListener('click', hideToast);
  $('.x').addEventListener('click', hideToast);
  $('.panel .close').addEventListener('click', closePanel);
  toast.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  toast.addEventListener('mouseleave', scheduleHide);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanel();
      hideToast();
    }
  });

  // The panel asks to close itself, or to be told about the current job.
  window.addEventListener('message', (event) => {
    if (event.source !== iframe?.contentWindow) return;
    if (event.data?.type === 'JOBPILOT_CLOSE') closePanel();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TOGGLE_PANEL') {
      panel.classList.contains('show') ? closePanel() : openPanel();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  (document.body || document.documentElement).appendChild(host);

  // Job boards like LinkedIn are single-page apps: the URL changes without a
  // reload when you click another job, so watch for that. Wait a moment after
  // each change so the new job has rendered.
  setTimeout(onPage, 1500);
  setInterval(() => {
    if (location.href !== lastUrl) setTimeout(onPage, 1200);
  }, 1000);
}
