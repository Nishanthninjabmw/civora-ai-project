import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../models/User';
import { ReportStatus, SeverityLabel } from '../models/HazardReport';

export interface DemoUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoReport {
  _id: string;
  reportId: string;
  citizen: any;
  imageUrl: string;
  hazardCategory: string;
  description?: string;
  aiDetections: Array<{
    class: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  modelMetadata?: {
    modelId: string;
    inferenceTimeMs: number;
  };
  aiSeverityRecommendation?: number;
  finalSeverityScore: number;
  severityLabel: SeverityLabel;
  location: {
    coordinates: [number, number];
    address?: string;
    accuracy?: number;
  };
  status: ReportStatus;
  assignedCrew?: any;
  adminNotes?: string;
  resolutionNotes?: string;
  resolutionImageUrl?: string;
  resolvedAt?: Date;
  resolvedBy?: any;
  statusHistory: Array<{
    status: ReportStatus;
    changedBy: any;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const defaultPasswordHash = bcrypt.hashSync('password123', 10);

const initialUsers: DemoUser[] = [
  {
    _id: '6707f1a10000000000000001',
    name: 'John Citizen',
    email: 'citizen@civora.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.Citizen,
    createdAt: new Date('2026-10-10T08:00:00Z'),
    updatedAt: new Date('2026-10-10T08:00:00Z')
  },
  {
    _id: '6707f1a10000000000000002',
    name: 'Admin Alice',
    email: 'admin@civora.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.Admin,
    createdAt: new Date('2026-10-10T08:00:00Z'),
    updatedAt: new Date('2026-10-10T08:00:00Z')
  },
  {
    _id: '6707f1a10000000000000003',
    name: 'Crew Bob',
    email: 'crew@civora.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.Crew,
    createdAt: new Date('2026-10-10T08:00:00Z'),
    updatedAt: new Date('2026-10-10T08:00:00Z')
  }
];

const initialReports: DemoReport[] = [
  {
    _id: '6707f1a20000000000000001',
    reportId: 'REP-DEMO-POTHOLE',
    citizen: {
      _id: '6707f1a10000000000000001',
      name: 'John Citizen',
      email: 'citizen@civora.com'
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=1000',
    hazardCategory: 'Pothole',
    description: 'Large pothole on Main St, very dangerous for bikes.',
    aiDetections: [{ class: 'pothole', confidence: 0.92, bbox: { x: 50, y: 50, width: 20, height: 20 } }],
    finalSeverityScore: 78,
    severityLabel: SeverityLabel.High,
    location: { coordinates: [-73.935242, 40.730610], address: 'Main St, NY' },
    status: ReportStatus.Submitted,
    statusHistory: [{
      status: ReportStatus.Submitted,
      changedBy: '6707f1a10000000000000001',
      timestamp: new Date('2026-10-10T09:00:00Z'),
      note: 'Hazard report submitted by citizen.'
    }],
    createdAt: new Date('2026-10-10T09:00:00Z'),
    updatedAt: new Date('2026-10-10T09:00:00Z')
  },
  {
    _id: '6707f1a20000000000000002',
    reportId: 'REP-DEMO-GARBAGE',
    citizen: {
      _id: '6707f1a10000000000000001',
      name: 'John Citizen',
      email: 'citizen@civora.com'
    },
    assignedCrew: {
      _id: '6707f1a10000000000000003',
      name: 'Crew Bob',
      email: 'crew@civora.com'
    },
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1000',
    hazardCategory: 'Garbage',
    description: 'Illegal dumping near the park entrance.',
    aiDetections: [],
    finalSeverityScore: 30,
    severityLabel: SeverityLabel.Low,
    location: { coordinates: [-73.94, 40.74], address: 'Park Ave, NY' },
    status: ReportStatus.Assigned,
    statusHistory: [
      { status: ReportStatus.Submitted, changedBy: '6707f1a10000000000000001', timestamp: new Date('2026-10-11T10:00:00Z') },
      { status: ReportStatus.UnderReview, changedBy: '6707f1a10000000000000002', timestamp: new Date('2026-10-11T10:30:00Z') },
      { status: ReportStatus.Assigned, changedBy: '6707f1a10000000000000002', timestamp: new Date('2026-10-11T11:00:00Z'), note: 'Assigned to Bob' }
    ],
    createdAt: new Date('2026-10-11T10:00:00Z'),
    updatedAt: new Date('2026-10-11T11:00:00Z')
  }
];

class DemoDataStore {
  private users: DemoUser[] = [...initialUsers];
  private reports: DemoReport[] = [...initialReports];

  public getUserByEmail(email: string): DemoUser | undefined {
    const normalized = email.trim().toLowerCase();
    return this.users.find(u => u.email.toLowerCase() === normalized);
  }

  public getUserById(id: string): DemoUser | undefined {
    return this.users.find(u => u._id === id || String(u._id) === String(id));
  }

  public createUser(name: string, email: string, passwordHash: string): DemoUser {
    const user: DemoUser = {
      _id: uuidv4().replace(/-/g, '').slice(0, 24),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: UserRole.Citizen,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  public getCrewMembers() {
    return this.users
      .filter(u => u.role === UserRole.Crew)
      .map(u => ({ _id: u._id, name: u.name, email: u.email, role: u.role }));
  }

  public createReport(data: Partial<DemoReport>): DemoReport {
    const now = new Date();
    const citizen = this.getUserById(data.citizen?._id || data.citizen) || {
      _id: String(data.citizen),
      name: 'Demo Citizen',
      email: 'citizen@civora.com'
    };

    const newReport: DemoReport = {
      _id: uuidv4().replace(/-/g, '').slice(0, 24),
      reportId: data.reportId || `REP-${uuidv4().split('-')[0].toUpperCase()}`,
      citizen: { _id: citizen._id, name: citizen.name, email: citizen.email },
      imageUrl: data.imageUrl || '',
      hazardCategory: data.hazardCategory || 'Pothole',
      description: data.description,
      aiDetections: data.aiDetections || [],
      modelMetadata: data.modelMetadata,
      aiSeverityRecommendation: data.aiSeverityRecommendation,
      finalSeverityScore: data.finalSeverityScore || 50,
      severityLabel: data.severityLabel || SeverityLabel.Medium,
      location: data.location || { coordinates: [0, 0] },
      status: data.status || ReportStatus.Submitted,
      statusHistory: data.statusHistory || [{
        status: ReportStatus.Submitted,
        changedBy: citizen._id,
        timestamp: now,
        note: 'Hazard report submitted by citizen.'
      }],
      createdAt: now,
      updatedAt: now
    };
    this.reports.push(newReport);
    return newReport;
  }

  public getReports(options: {
    role: string;
    userId: string;
    status?: string;
    severity?: string;
    category?: string;
    unresolved?: boolean;
    sort?: string;
  }): DemoReport[] {
    let filtered = [...this.reports];

    if (options.role === 'Citizen') {
      filtered = filtered.filter(r => {
        const cId = r.citizen?._id ? String(r.citizen._id) : String(r.citizen);
        return cId === String(options.userId);
      });
    } else if (options.role === 'Crew') {
      filtered = filtered.filter(r => {
        const crId = r.assignedCrew?._id ? String(r.assignedCrew._id) : String(r.assignedCrew);
        return crId === String(options.userId);
      });
    }

    if (options.status && options.status !== 'ALL') {
      filtered = filtered.filter(r => r.status === options.status);
    } else if (options.unresolved) {
      filtered = filtered.filter(r =>
        r.status !== ReportStatus.Resolved &&
        r.status !== ReportStatus.Rejected &&
        r.status !== ReportStatus.Duplicate
      );
    }

    if (options.severity && options.severity !== 'ALL') {
      filtered = filtered.filter(r => r.severityLabel === options.severity);
    }

    if (options.category && options.category !== 'ALL') {
      filtered = filtered.filter(r => r.hazardCategory === options.category);
    }

    // Priority-First Sorting: finalSeverityScore DESC, createdAt ASC
    filtered.sort((a, b) => {
      if (options.sort === 'severity_asc') {
        if (a.finalSeverityScore !== b.finalSeverityScore) return a.finalSeverityScore - b.finalSeverityScore;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (options.sort === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (options.sort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        // Default: Severity score DESC, oldest tiebreaker
        if (b.finalSeverityScore !== a.finalSeverityScore) return b.finalSeverityScore - a.finalSeverityScore;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

    return filtered;
  }

  public getReportById(id: string): DemoReport | undefined {
    return this.reports.find(r => r._id === id || r.reportId === id);
  }

  public updateReport(id: string, updates: Partial<DemoReport>): DemoReport | undefined {
    const report = this.getReportById(id);
    if (!report) return undefined;

    Object.assign(report, updates, { updatedAt: new Date() });
    return report;
  }

  public getDashboardStats() {
    const total = this.reports.length;
    const pending = this.reports.filter(r =>
      r.status === ReportStatus.Submitted || r.status === ReportStatus.UnderReview
    ).length;
    const critical = this.reports.filter(r => r.severityLabel === SeverityLabel.Critical).length;
    const resolved = this.reports.filter(r => r.status === ReportStatus.Resolved).length;

    return { total, pending, critical, resolved };
  }
}

export const demoStore = new DemoDataStore();
