export interface Resume {
  id: string;
  name: string;
  uploadedAt: Date;
  skills: string[];
  experience: string;
  education: string;
  parsed: boolean;
}

export interface Job {
  id: string | number;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote' | string;
  salary?: string;
  description: string;
  requirements: string[];
  matchScore: number;
  matchReasons?: string[];
  recommendation?: 'strong_apply' | 'consider' | 'skip';
  source: string;
  url: string;
  postedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'interview';
}

export interface Application {
  id: string;
  job: Job;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'submitted' | 'interview' | 'rejected_by_company';
  appliedAt?: Date;
  emailDraft: EmailDraft;
  coverLetter?: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  attachments: string[];
}

export interface ApprovalItem {
  id: string;
  type: 'application' | 'email' | 'form';
  job: Job;
  preview: EmailDraft | FormData;
  createdAt: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface GoogleAccount {
  connected: boolean;
  email: string;
  name: string;
  avatar: string;
  services: {
    gmail: boolean;
    drive: boolean;
    calendar: boolean;
  };
}

export type ViewType = 'dashboard' | 'jobs' | 'applications' | 'approvals' | 'resume' | 'settings';
