# JobPilot Assist (Chrome extension)

The boards JobPilot reads from the server are the ones that allow it. Naukri,
Indeed, Glassdoor and Wellfound all refuse server-side requests (403/406), but
they serve *your* logged-in browser normally. This extension runs inside that
session: it reads the posting you already have open, drafts the letter, and
fills the form. You press submit — nothing is submitted for you.

## Install (2 minutes, unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension` folder.
4. Pin **JobPilot Assist** to the toolbar.

## Use

1. Open any posting on LinkedIn, Naukri, Indeed, Glassdoor or Wellfound.
2. Click the JobPilot Assist icon — it shows the title, company and location it read.
3. Open **Your details** once and fill name, email, phone, skills, LinkedIn, then **Save details**.
4. **Draft cover letter** → Gemini (via your deployed JobPilot API) writes a tailored letter.
5. **Fill application form** → fills name/email/phone/cover-letter fields on the page.
6. Review, then press the site's own submit button.

## What it deliberately does not do

- No automatic submitting, clicking or form submission.
- No background scraping of pages you did not open.
- No storing of credentials; only the profile details you type, in `chrome.storage.local`.

Automating submission on these boards breaches their terms and gets accounts
banned; captchas and session checks catch it quickly. Preparing the application
is the part worth automating.

## How the job is read

1. `schema.org` `JobPosting` JSON-LD when the page includes it (most do).
2. Otherwise site-specific selectors per board.
3. Falls back to the page title for the job name.

## Files

| File | Role |
|---|---|
| `manifest.json` | Manifest V3, host permissions for the five boards and the JobPilot API |
| `content.js` | Extracts the posting; fills fields on request |
| `background.js` | Calls `/api/gemini` for the cover letter |
| `popup.html` / `popup.js` | The panel you click |
