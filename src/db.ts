import Dexie, { Table } from 'dexie';

export interface Resume {
  id?: number;
  fileName: string;
  rawText: string;
  parsedData: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
    }>;
  };
  uploadedAt: Date;
}

export interface Job {
  id?: number;
  externalId: string;
  title: string;
  company: string;
  location: string;
  type: string;
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
  foundAt: Date;
}

export interface Application {
  id?: number;
  jobId: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'submitted' | 'interview';
  emailDraft: {
    to: string;
    subject: string;
    body: string;
    attachments: string[];
  };
  coverLetter?: string;
  appliedAt?: Date;
  createdAt: Date;
}

export interface Settings {
  id?: number;
  gmailConnected: boolean;
  googleConnected: boolean;
  autoApply: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  maxDailyApplications: number;
  minMatchScore: number;
  desiredRoles: string;
  locationPreference: string;
  salaryRange: string;
  jobTypes: string;
  companiesToSkip: string;
  searchFrequency: string;
  autoSearchFromResume: boolean;
  skillBasedMatching: boolean;
  experienceLevelMatching: boolean;
}

class JobPilotDatabase extends Dexie {
  resumes!: Table<Resume>;
  jobs!: Table<Job>;
  applications!: Table<Application>;
  settings!: Table<Settings>;

  constructor() {
    super('JobPilotDB');
    this.version(1).stores({
      resumes: '++id, fileName, uploadedAt',
      jobs: '++id, externalId, title, company, matchScore, status, foundAt',
      applications: '++id, jobId, status, createdAt',
      settings: '++id'
    });
  }
}

export const db = new JobPilotDatabase();

// Helper functions
export const dbHelpers = {
  // Resume
  async saveResume(resume: Omit<Resume, 'id'>): Promise<number> {
    return await db.resumes.add(resume);
  },

  async getResume(): Promise<Resume | undefined> {
    return await db.resumes.orderBy('uploadedAt').last();
  },

  async deleteResume(id: number): Promise<void> {
    await db.resumes.delete(id);
  },

  // Jobs
  async saveJobs(jobs: Omit<Job, 'id'>[]): Promise<number[]> {
    return await db.jobs.bulkAdd(jobs);
  },

  async getJobs(status?: string): Promise<Job[]> {
    if (status) {
      return await db.jobs.where('status').equals(status).reverse().sortBy('foundAt');
    }
    return await db.jobs.orderBy('foundAt').reverse().toArray();
  },

  async getJobsByMatchScore(limit: number = 50): Promise<Job[]> {
    return await db.jobs.orderBy('matchScore').reverse().limit(limit).toArray();
  },

  async updateJobStatus(id: number, status: Job['status']): Promise<void> {
    await db.jobs.update(id, { status });
  },

  async deleteJob(id: number): Promise<void> {
    await db.jobs.delete(id);
  },

  async clearJobs(): Promise<void> {
    await db.jobs.clear();
  },

  async updateJobMatch(
    id: number,
    patch: { matchScore?: number; matchReasons?: string[]; recommendation?: Job['recommendation'] }
  ): Promise<void> {
    await db.jobs.update(id, {
      matchScore: patch.matchScore,
      matchReasons: patch.matchReasons,
      recommendation: patch.recommendation,
    } as any);
  },

  // Applications
  async saveApplication(application: Omit<Application, 'id'>): Promise<number> {
    return await db.applications.add(application);
  },

  async getApplications(status?: string): Promise<Application[]> {
    if (status) {
      return await db.applications.where('status').equals(status).reverse().sortBy('createdAt');
    }
    return await db.applications.orderBy('createdAt').reverse().toArray();
  },

  async getApplicationByJobId(jobId: number): Promise<Application | undefined> {
    return await db.applications.where('jobId').equals(jobId).first();
  },

  async updateApplicationStatus(id: number, status: Application['status']): Promise<void> {
    await db.applications.update(id, { status });
  },

  async deleteApplication(id: number): Promise<void> {
    await db.applications.delete(id);
  },

  // Settings
  async saveSettings(settings: Omit<Settings, 'id'>): Promise<number> {
    const existing = await db.settings.toCollection().first();
    if (existing?.id) {
      await db.settings.update(existing.id, settings);
      return existing.id;
    }
    return await db.settings.add(settings);
  },

  async getSettings(): Promise<Settings | undefined> {
    return await db.settings.toCollection().first();
  },

  // Stats
  async getStats() {
    const totalJobs = await db.jobs.count();
    const totalApplications = await db.applications.count();
    const submittedApplications = await db.applications.where('status').equals('submitted').count();
    const interviewApplications = await db.applications.where('status').equals('interview').count();
    const pendingApplications = await db.applications.where('status').equals('pending_approval').count();
    
    return {
      totalJobs,
      totalApplications,
      submittedApplications,
      interviewApplications,
      pendingApplications
    };
  }
};
