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

## Where it works

- **Job boards:** LinkedIn, Naukri, Indeed, Glassdoor, Wellfound, foundit, Instahyre, Cutshort, iimjobs, Internshala.
- **Company careers pages:** Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, Freshteam, Keka, Darwinbox, Zoho Recruit (forms embedded in an iframe included).
- **Any other site:** click the icon and it injects itself into that tab.

## Use

1. Open a posting or an application form.
2. Click the JobPilot Assist icon — it shows the title, company and location it read.
3. Open **Your details** once: name, email, phone, skills, LinkedIn, city, current company, website, and pick your resume file. Then **Save details**.
4. **Draft cover letter** → Gemini (via your deployed JobPilot API) writes a tailored letter.
5. **Fill application form** → fills first/last/full name, email, phone, LinkedIn, website, city, current company and the cover-letter box, and attaches your resume to the upload field. Salary, password and captcha fields are never touched.
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
| `manifest.json` | Manifest V3; boards and common ATS hosts get the script automatically, other sites through `activeTab` |
| `content.js` | Extracts the posting; fills fields on request |
| `background.js` | Calls `/api/gemini` for the cover letter |
| `popup.html` / `popup.js` | The panel you click |
