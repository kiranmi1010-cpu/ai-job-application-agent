import { Job, Application, ApprovalItem } from './types';

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    company: 'Google',
    location: 'Mountain View, CA (Remote)',
    type: 'Full-time',
    salary: '$180,000 - $250,000',
    description: 'Join our team to build next-generation web applications using React, TypeScript, and cutting-edge technologies.',
    requirements: ['5+ years React', 'TypeScript', 'System Design', 'Leadership'],
    matchScore: 95,
    source: 'LinkedIn',
    url: 'https://careers.google.com',
    postedDate: '2024-01-15',
    status: 'pending'
  },
  {
    id: '2',
    title: 'Full Stack Developer',
    company: 'Meta',
    location: 'Menlo Park, CA',
    type: 'Full-time',
    salary: '$170,000 - $230,000',
    description: 'Build scalable applications that serve billions of users worldwide.',
    requirements: ['React', 'Node.js', 'GraphQL', '3+ years experience'],
    matchScore: 88,
    source: 'Company Website',
    url: 'https://metacareers.com',
    postedDate: '2024-01-14',
    status: 'pending'
  },
  {
    id: '3',
    title: 'Software Engineer II',
    company: 'Amazon',
    location: 'Seattle, WA (Hybrid)',
    type: 'Full-time',
    salary: '$150,000 - $200,000',
    description: 'Work on AWS services that power the cloud infrastructure for millions of businesses.',
    requirements: ['Java/Python', 'AWS', 'Distributed Systems', '2+ years'],
    matchScore: 82,
    source: 'Indeed',
    url: 'https://amazon.jobs',
    postedDate: '2024-01-13',
    status: 'pending'
  },
  {
    id: '4',
    title: 'React Developer',
    company: 'Stripe',
    location: 'San Francisco, CA (Remote)',
    type: 'Full-time',
    salary: '$160,000 - $220,000',
    description: 'Help build the economic infrastructure for the internet with modern React applications.',
    requirements: ['React', 'TypeScript', 'Payment Systems', '4+ years'],
    matchScore: 91,
    source: 'LinkedIn',
    url: 'https://stripe.com/jobs',
    postedDate: '2024-01-12',
    status: 'pending'
  },
  {
    id: '5',
    title: 'Frontend Architect',
    company: 'Netflix',
    location: 'Los Gatos, CA',
    type: 'Full-time',
    salary: '$200,000 - $280,000',
    description: 'Architect and build the next generation of streaming experiences for 200M+ subscribers.',
    requirements: ['React', 'Performance Optimization', 'Architecture', '7+ years'],
    matchScore: 78,
    source: 'Company Website',
    url: 'https://jobs.netflix.com',
    postedDate: '2024-01-11',
    status: 'pending'
  },
  {
    id: '6',
    title: 'Senior UI Engineer',
    company: 'Airbnb',
    location: 'San Francisco, CA (Remote)',
    type: 'Full-time',
    salary: '$165,000 - $215,000',
    description: 'Build beautiful, accessible interfaces for the worlds largest travel platform.',
    requirements: ['React', 'Design Systems', 'Accessibility', '5+ years'],
    matchScore: 86,
    source: 'LinkedIn',
    url: 'https://careers.airbnb.com',
    postedDate: '2024-01-10',
    status: 'pending'
  }
];

export const mockApplications: Application[] = [
  {
    id: 'app-1',
    job: mockJobs[0],
    status: 'submitted',
    appliedAt: new Date('2024-01-16'),
    emailDraft: {
      to: 'careers@google.com',
      subject: 'Application for Senior Frontend Engineer - [Your Name]',
      body: 'Dear Hiring Team,\n\nI am writing to express my strong interest in the Senior Frontend Engineer position at Google. With over 5 years of experience building scalable web applications using React and TypeScript, I am confident in my ability to contribute meaningfully to your team.\n\nMy experience includes leading frontend architecture decisions, mentoring junior developers, and delivering high-impact features that serve millions of users daily.\n\nI have attached my resume for your review and look forward to discussing how my skills align with your team\'s needs.\n\nBest regards,\n[Your Name]',
      attachments: ['Resume_2024.pdf', 'Cover_Letter_Google.pdf']
    }
  },
  {
    id: 'app-2',
    job: mockJobs[1],
    status: 'interview',
    appliedAt: new Date('2024-01-14'),
    emailDraft: {
      to: 'talent@meta.com',
      subject: 'Application for Full Stack Developer - [Your Name]',
      body: 'Dear Meta Recruiting Team,\n\nI am excited to apply for the Full Stack Developer position at Meta. My background in building scalable applications with React, Node.js, and GraphQL aligns perfectly with the requirements of this role.\n\nI have extensive experience working with high-traffic applications and am passionate about building products that connect people globally.\n\nPlease find my resume attached. I would welcome the opportunity to discuss my qualifications further.\n\nWarm regards,\n[Your Name]',
      attachments: ['Resume_2024.pdf', 'Cover_Letter_Meta.pdf']
    }
  },
  {
    id: 'app-3',
    job: mockJobs[3],
    status: 'pending_approval',
    appliedAt: undefined,
    emailDraft: {
      to: 'jobs@stripe.com',
      subject: 'Application for React Developer - [Your Name]',
      body: 'Dear Stripe Hiring Team,\n\nI am writing to apply for the React Developer position at Stripe. Your mission to build economic infrastructure for the internet resonates deeply with me.\n\nWith my strong background in React, TypeScript, and payment system integrations, I am well-equipped to contribute to Stripe\'s world-class engineering team.\n\nI have attached my resume and would love the opportunity to discuss how I can add value to your team.\n\nBest regards,\n[Your Name]',
      attachments: ['Resume_2024.pdf', 'Cover_Letter_Stripe.pdf']
    }
  }
];

export const mockApprovals: ApprovalItem[] = [
  {
    id: 'approval-1',
    type: 'application',
    job: mockJobs[3],
    preview: {
      to: 'jobs@stripe.com',
      subject: 'Application for React Developer - [Your Name]',
      body: 'Dear Stripe Hiring Team,\n\nI am writing to apply for the React Developer position at Stripe. Your mission to build economic infrastructure for the internet resonates deeply with me.\n\nWith my strong background in React, TypeScript, and payment system integrations, I am well-equipped to contribute to Stripe\'s world-class engineering team.\n\nI have attached my resume and would love the opportunity to discuss how I can add value to your team.\n\nBest regards,\n[Your Name]',
      attachments: ['Resume_2024.pdf', 'Cover_Letter_Stripe.pdf']
    },
    createdAt: new Date(),
    priority: 'high'
  },
  {
    id: 'approval-2',
    type: 'application',
    job: mockJobs[5],
    preview: {
      to: 'careers@airbnb.com',
      subject: 'Application for Senior UI Engineer - [Your Name]',
      body: 'Dear Airbnb Engineering Team,\n\nI am thrilled to apply for the Senior UI Engineer position at Airbnb. Your commitment to beautiful, accessible design aligns perfectly with my professional values and technical expertise.\n\nWith 5+ years of experience building design systems and accessible interfaces using React, I am confident I can contribute to creating world-class experiences for your global user base.\n\nPlease find my resume attached. I look forward to the possibility of joining your talented team.\n\nBest regards,\n[Your Name]',
      attachments: ['Resume_2024.pdf', 'Cover_Letter_Airbnb.pdf']
    },
    createdAt: new Date(),
    priority: 'medium'
  },
  {
    id: 'approval-3',
    type: 'email',
    job: mockJobs[2],
    preview: {
      to: 'recruiting@amazon.com',
      subject: 'Follow-up: Software Engineer II Application - [Your Name]',
      body: 'Dear Amazon Recruiting Team,\n\nI hope this message finds you well. I recently applied for the Software Engineer II position and wanted to express my continued strong interest in this opportunity.\n\nI believe my experience with distributed systems and cloud technologies would be a great fit for the AWS team. I would welcome any opportunity to further discuss my qualifications.\n\nThank you for your time and consideration.\n\nBest regards,\n[Your Name]',
      attachments: []
    },
    createdAt: new Date(),
    priority: 'low'
  }
];
