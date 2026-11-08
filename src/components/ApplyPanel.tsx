import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
  Mail,
  ClipboardCheck,
  AlertCircle,
  Gauge,
  MessagesSquare,
  ShieldAlert,
} from 'lucide-react';
import { dbHelpers } from '../db';
import {
  generateCoverLetterWithGemini,
  analyzeJobFitWithGemini,
  interviewPrepWithGemini,
  JobFitAnalysis,
  InterviewPrep,
  JobPreferences,
} from '../services/gemini';

type Tab = 'letter' | 'fit' | 'interview';

async function loadPreferences(): Promise<JobPreferences> {
  try {
    const s: any = await dbHelpers.getSettings();
    if (!s) return {};
    return {
      desiredRoles: s.desiredRoles,
      locationPreference: s.locationPreference,
      jobTypes: s.jobTypes,
      salaryRange: s.salaryRange,
    };
  } catch {
    return {};
  }
}

const gateStyle: Record<string, string> = {
  PASS: 'bg-green-50 text-green-700 border-green-200',
  FLAG: 'bg-amber-50 text-amber-700 border-amber-200',
  FAIL: 'bg-red-50 text-red-700 border-red-200',
};

const dimensionLabels: Record<string, string> = {
  technical: 'Skills match (30%)',
  experience: 'Experience match (25%)',
  culture: 'Culture fit (15%)',
  career: 'Career alignment (30%)',
};

const toneClass: Record<string, string> = {
  slate: 'text-slate-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
};

function List({ title, items, tone = 'slate' }: { title: string; items?: string[]; tone?: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase mb-1 ${toneClass[tone] || toneClass.slate}`}>{title}</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PostingWarning({ flags }: { flags?: string[] }) {
  if (!flags?.length) return null;
  return (
    <div className="flex items-start gap-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
      <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">This posting contains suspicious hidden text or AI instructions. They were ignored, but check the posting is genuine.</p>
        <ul className="list-disc pl-4 mt-1">
          {flags.slice(0, 4).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface Props {
  job: any | null;
  onClose: () => void;
  onDone: () => void;
}

/**
 * "Prepare & apply" panel.
 *
 * JobPilot cannot submit an application by itself: Naukri, Indeed, Glassdoor,
 * LinkedIn and Wellfound expose no application API, and all of them forbid
 * automated submission. So this panel does the part that can be automated —
 * a tailored cover letter plus the exact posting link — and leaves the single
 * submit click to you.
 */
export default function ApplyPanel({ job, onClose, onDone }: Props) {
  const [coverLetter, setCoverLetter] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [existing, setExisting] = useState<any | null>(null);
  const [tab, setTab] = useState<Tab>('letter');
  const [stretches, setStretches] = useState<string[]>([]);
  const [postingFlags, setPostingFlags] = useState<string[]>([]);
  const [fit, setFit] = useState<JobFitAnalysis | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);

  const applyUrl = useMemo(() => (job?.url ? String(job.url) : ''), [job]);

  useEffect(() => {
    if (!job) return;
    setCoverLetter('');
    setSubject(`Application for ${job.title} at ${job.company}`);
    setError(null);
    setCopied(null);
    setExisting(null);
    setTab('letter');
    setStretches([]);
    setPostingFlags([]);
    setFit(null);
    setPrep(null);
    if (job.id) {
      dbHelpers
        .getApplicationByJobId(Number(job.id))
        .then((row) => setExisting(row || null))
        .catch(() => setExisting(null));
    }
  }, [job]);

  if (!job) return null;

  const fallbackLetter = async () => {
    const resume = await dbHelpers.getResume();
    const parsed = resume?.parsedData;
    const name = parsed?.name || 'Your name';
    const skills = (parsed?.skills || job.requirements || []).slice(0, 5).join(', ');
    return [
      `Dear ${job.company} Hiring Team,`,
      '',
      `I am writing to apply for the ${job.title} role. My background lines up closely with what the posting asks for${
        skills ? `, particularly ${skills}` : ''
      }, and I would welcome the chance to contribute to your team.`,
      '',
      `I have attached my resume and can share further details on request. Thank you for your time and consideration.`,
      '',
      'Best regards,',
      name,
      parsed?.email || '',
    ]
      .filter((line) => line !== undefined)
      .join('\n');
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const resume = await dbHelpers.getResume();
      if (!resume?.parsedData) {
        setCoverLetter(await fallbackLetter());
        setError('No parsed resume found, so a generic letter was drafted. Upload a resume to get a tailored one.');
        return;
      }
      const result = await generateCoverLetterWithGemini(resume.parsedData, job);
      if (result.success && result.data?.body) {
        setCoverLetter(result.data.body);
        if (result.data.subject) setSubject(result.data.subject);
        setStretches(result.data.stretches || []);
        setPostingFlags(result.data.postingFlags || []);
      } else {
        setCoverLetter(await fallbackLetter());
        if (result.error) setError(`AI drafting failed (${result.error}). A generic letter is shown instead.`);
      }
    } catch (err: any) {
      setCoverLetter(await fallbackLetter());
      setError(err?.message || 'Could not generate a letter.');
    } finally {
      setLoading(false);
    }
  };

  const checkFit = async () => {
    setFitLoading(true);
    setError(null);
    try {
      const resume = await dbHelpers.getResume();
      if (!resume?.parsedData) {
        setError('Upload your resume first so the fit check has something to compare.');
        return;
      }
      const result = await analyzeJobFitWithGemini(resume.parsedData, job, await loadPreferences());
      if (result.success && result.data) {
        setFit(result.data);
        setPostingFlags(result.data.postingFlags || []);
      } else setError(`Fit check failed: ${result.error || 'no response'}`);
    } catch (err: any) {
      setError(err?.message || 'Fit check failed.');
    } finally {
      setFitLoading(false);
    }
  };

  const buildPrep = async () => {
    setPrepLoading(true);
    setError(null);
    try {
      const resume = await dbHelpers.getResume();
      if (!resume?.parsedData) {
        setError('Upload your resume first so interview prep can use your real experience.');
        return;
      }
      const result = await interviewPrepWithGemini(resume.parsedData, job, await loadPreferences());
      if (result.success && result.data) {
        setPrep(result.data);
        setPostingFlags(result.data.postingFlags || []);
      } else setError(`Interview prep failed: ${result.error || 'no response'}`);
    } catch (err: any) {
      setError(err?.message || 'Interview prep failed.');
    } finally {
      setPrepLoading(false);
    }
  };

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError('Clipboard is blocked by the browser; select the text and copy manually.');
    }
  };

  const markApplied = async () => {
    setSaving(true);
    setError(null);
    try {
      const jobId = Number(job.id);
      const payload = {
        jobId,
        status: 'submitted' as const,
        emailDraft: { to: '', subject, body: coverLetter, attachments: [] },
        coverLetter,
        appliedAt: new Date(),
        createdAt: new Date(),
      };
      if (existing?.id) {
        await dbHelpers.updateApplicationStatus(existing.id, 'submitted');
      } else {
        await dbHelpers.saveApplication(payload);
      }
      await dbHelpers.updateJobStatus(jobId, 'applied');
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save the application.');
    } finally {
      setSaving(false);
    }
  };

  const openAndCopy = async () => {
    if (coverLetter) await copy('letter', coverLetter);
    if (applyUrl) window.open(applyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{job.title}</h2>
            <p className="text-sm text-slate-500">
              {job.company} · {job.location}
              {job.source ? ` · via ${job.source}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-sm">
            {([
              ['letter', 'Cover letter', Mail],
              ['fit', 'Check fit', Gauge],
              ['interview', 'Interview prep', MessagesSquare],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-medium ${
                  tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <PostingWarning flags={postingFlags} />

          {error && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'fit' && (
            <div className="space-y-4">
              <button
                onClick={checkFit}
                disabled={fitLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {fitLoading ? <Loader2 size={16} className="animate-spin" /> : <Gauge size={16} />}
                {fitLoading ? 'Evaluating…' : fit ? 'Re-check fit' : 'Check if this job fits me'}
              </button>
              {!fit && !fitLoading && (
                <p className="text-xs text-slate-500">
                  Runs hard checks first (eligibility, language, location), then scores skills, experience, culture and
                  career alignment against your resume and the target roles in Settings.
                </p>
              )}
              {fit && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-slate-900">{fit.matchScore}</div>
                    <div>
                      <p className="font-semibold text-slate-900">{fit.verdict}</p>
                      <p className="text-xs text-slate-500">{fit.advice}</p>
                    </div>
                  </div>
                  {fit.gates && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(fit.gates).map(([name, g]) => (
                        <span
                          key={name}
                          title={g.note}
                          className={`text-xs px-2 py-1 rounded-lg border ${gateStyle[String(g.result).toUpperCase()] || gateStyle.FLAG}`}
                        >
                          {name}: {g.result}
                          {g.result !== 'PASS' && g.note ? ` · ${g.note}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {fit.dimensions && (
                    <div className="space-y-2">
                      {Object.entries(fit.dimensions).map(([name, d]) => (
                        <div key={name}>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>{dimensionLabels[name] || name}</span>
                            <span className="font-medium">{d.score}/100</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${d.score}%` }} />
                          </div>
                          {d.note && <p className="text-xs text-slate-500 mt-0.5">{d.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-700">{fit.summary}</p>
                  <List title="Strengths" items={fit.strengths} tone="green" />
                  <List title="Gaps to address" items={fit.gaps} tone="amber" />
                  <List title="Would be a stretch to claim" items={fit.stretches} tone="red" />
                  <List title="Tips" items={fit.tips} />
                  <List title="Worth asking the employer first" items={fit.questionsForEmployer} />
                </div>
              )}
            </div>
          )}

          {tab === 'interview' && (
            <div className="space-y-4">
              <button
                onClick={buildPrep}
                disabled={prepLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {prepLoading ? <Loader2 size={16} className="animate-spin" /> : <MessagesSquare size={16} />}
                {prepLoading ? 'Preparing…' : prep ? 'Rebuild prep' : 'Build interview prep'}
              </button>
              {!prep && !prepLoading && (
                <p className="text-xs text-slate-500">
                  Builds STAR stories from your real resume, likely and tough questions for this role, and good
                  questions to ask the interviewer.
                </p>
              )}
              {prep && (
                <div className="space-y-4 text-sm text-slate-700">
                  {prep.pitch && (
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase text-slate-600 mb-1">Tell me about yourself</p>
                        <button
                          onClick={() => copy('pitch', prep.pitch)}
                          className="text-xs text-blue-600 flex items-center gap-1"
                        >
                          {copied === 'pitch' ? <Check size={12} /> : <Copy size={12} />} copy
                        </button>
                      </div>
                      <p className="bg-slate-50 rounded-lg p-3">{prep.pitch}</p>
                    </div>
                  )}
                  {!!prep.starStories?.length && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-600">Your STAR stories</p>
                      {prep.starStories.map((s, i) => (
                        <details key={i} className="bg-slate-50 rounded-lg p-3">
                          <summary className="font-medium cursor-pointer">
                            {s.title} <span className="text-xs text-slate-500">· {s.competency}</span>
                          </summary>
                          <div className="mt-2 space-y-1">
                            <p><b>S:</b> {s.situation}</p>
                            <p><b>T:</b> {s.task}</p>
                            <p><b>A:</b> {s.action}</p>
                            <p><b>R:</b> {s.result}</p>
                            {!!s.useFor?.length && <p className="text-xs text-slate-500">Use for: {s.useFor.join(', ')}</p>}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                  {!!prep.likelyQuestions?.length && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-600">Likely questions</p>
                      {prep.likelyQuestions.map((q, i) => (
                        <details key={i} className="border border-slate-100 rounded-lg p-3">
                          <summary className="font-medium cursor-pointer">{q.question}</summary>
                          <p className="text-xs text-slate-500 mt-1">Testing: {q.why}</p>
                          <p className="mt-1">{q.approach}</p>
                        </details>
                      ))}
                    </div>
                  )}
                  {!!prep.toughQuestions?.length && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-amber-600">Tough questions</p>
                      {prep.toughQuestions.map((q, i) => (
                        <details key={i} className="border border-amber-100 rounded-lg p-3">
                          <summary className="font-medium cursor-pointer">{q.question}</summary>
                          <p className="mt-1">{q.approach}</p>
                        </details>
                      ))}
                    </div>
                  )}
                  <List title="Questions to ask them" items={prep.questionsToAsk} />
                  <List title="Research before the interview" items={prep.researchBefore} />
                </div>
              )}
            </div>
          )}

          {tab === 'letter' && (
          <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Drafting…' : coverLetter ? 'Redraft letter' : 'Draft cover letter'}
            </button>
            <button
              onClick={openAndCopy}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:opacity-90"
            >
              <ExternalLink size={16} />
              Copy letter & open posting
            </button>
            <button
              onClick={markApplied}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
              {existing ? 'Keep as applied' : 'Mark as applied'}
            </button>
          </div>

          {!applyUrl && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              This posting has no direct apply link. Open the board link below and search the title to apply.
            </p>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase">Subject</label>
              <button
                onClick={() => copy('subject', subject)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {copied === 'subject' ? <Check size={12} /> : <Copy size={12} />} copy
              </button>
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                <Mail size={12} /> Cover letter
              </label>
              <button
                onClick={() => copy('letter', coverLetter)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {copied === 'letter' ? <Check size={12} /> : <Copy size={12} />} copy
              </button>
            </div>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={12}
              placeholder="Draft a cover letter, or write one here. It is saved with the application."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {stretches.length > 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-medium mb-1">Check these lines before sending. They stretch your experience:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {stretches.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <p className="mt-1">Keep, soften or drop each one. You should be able to explain every line in an interview.</p>
            </div>
          )}
          </>
          )}

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            JobPilot does not submit applications for you — no job board allows it. This panel prepares everything and
            opens the posting; you press submit there, then mark it applied so it lands in Applications.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
