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
} from 'lucide-react';
import { dbHelpers } from '../db';
import { generateCoverLetterWithGemini } from '../services/gemini';

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

  const applyUrl = useMemo(() => (job?.url ? String(job.url) : ''), [job]);

  useEffect(() => {
    if (!job) return;
    setCoverLetter('');
    setSubject(`Application for ${job.title} at ${job.company}`);
    setError(null);
    setCopied(null);
    setExisting(null);
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

          {error && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
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

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            JobPilot does not submit applications for you — no job board allows it. This panel prepares everything and
            opens the posting; you press submit there, then mark it applied so it lands in Applications.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
