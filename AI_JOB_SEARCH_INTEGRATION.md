# What JobPilot took from ai-job-search

[ai-job-search](https://github.com/ai-job-search-dev/ai-job-search) (MIT) is a Claude Code
framework that runs in a terminal and writes LaTeX CVs. Its job portals are mostly
Danish, and its LinkedIn source uses the same public endpoint JobPilot already uses,
so those parts were not copied. Its real value is the judgement it encodes, and that
is now in JobPilot's AI endpoint (`api/gemini.ts`):

| From ai-job-search | Where it lives in JobPilot |
|---|---|
| Job evaluation framework (`04-job-evaluation.md`): eligibility, language and location gates, then skills 30%, experience 25%, culture 15% and career alignment 30% | `analyze-job-fit` action, **Check fit** tab in the Apply panel. The overall score is calculated in code, not by the model. |
| Writing style guide (`03-writing-style.md`): no em-dashes, no cliches, forward-looking letters, the "interview backtrack test" for honest framing | `generate-cover-letter` action. Lines that stretch your experience are listed under the letter so you can keep, soften or drop them. |
| Interview prep guide (`07-interview-prep.md`): STAR stories, tough questions, questions to ask | New `interview-prep` action, **Interview prep** tab in the Apply panel |
| Posting guard (`tools/posting_guard.py`): postings are untrusted data | `api/_lib/postingGuard.ts`. Removes invisible characters and flags hidden AI instructions in job descriptions before they reach any prompt. |
| "Match on function, not job title" | `match-jobs` prompt |

## Using it

1. Fill in **Settings → Desired roles** and **Location preference**. The fit check uses
   them for the career-alignment score and the location gate.
2. Open any job's Apply panel and use the three tabs: **Cover letter**, **Check fit**,
   **Interview prep**.

## Writing engine (all free)

Text a recruiter reads (cover letters, form answers, polish, follow-ups, interview
prep) now goes through a separate writer chain in `api/gemini.ts`:

1. **Gemini Flash** (`WRITER_MODEL`, default `gemini-flash-latest`) on the same free
   `GEMINI_API_KEY`. It writes far better than Flash-Lite, which stays in use for the
   fast analysis jobs (matching, fit checks).
2. **Groq** (optional, free, no card): add `GROQ_API_KEY` in Vercel and it takes over
   when Gemini is rate-limited. Default model `openai/gpt-oss-120b`; change with
   `GROQ_MODEL`.

Cover letters are written in two passes, like ai-job-search's drafter and reviewer:
a draft, then an editor pass that checks truth, specificity and relevance and
rewrites. `api/_lib/writingLint.ts` catches banned phrases, em-dashes and length in
code and hands each problem to the editor by name. Letters can be built around
**your own points** and copy **your writing sample** (Settings, or Your details in
the extension).
