"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoStore = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const User_1 = require("../models/User");
const HazardReport_1 = require("../models/HazardReport");
const defaultPasswordHash = bcryptjs_1.default.hashSync('password123', 10);
const initialUsers = [
    {
        _id: '6707f1a10000000000000001',
        name: 'John Citizen',
        email: 'citizen@civora.com',
        passwordHash: defaultPasswordHash,
        role: User_1.UserRole.Citizen,
        createdAt: new Date('2026-10-10T08:00:00Z'),
        updatedAt: new Date('2026-10-10T08:00:00Z')
    },
    {
        _id: '6707f1a10000000000000002',
        name: 'Admin Alice',
        email: 'admin@civora.com',
        passwordHash: defaultPasswordHash,
        role: User_1.UserRole.Admin,
        createdAt: new Date('2026-10-10T08:00:00Z'),
        updatedAt: new Date('2026-10-10T08:00:00Z')
    },
    {
        _id: '6707f1a10000000000000003',
        name: 'Crew Bob',
        email: 'crew@civora.com',
        passwordHash: defaultPasswordHash,
        role: User_1.UserRole.Crew,
        createdAt: new Date('2026-10-10T08:00:00Z'),
        updatedAt: new Date('2026-10-10T08:00:00Z')
    }
];
const initialReports = [
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
        severityLabel: HazardReport_1.SeverityLabel.High,
        location: { coordinates: [-73.935242, 40.730610], address: 'Main St, NY' },
        status: HazardReport_1.ReportStatus.Submitted,
        statusHistory: [{
                status: HazardReport_1.ReportStatus.Submitted,
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
        severityLabel: HazardReport_1.SeverityLabel.Low,
        location: { coordinates: [-73.94, 40.74], address: 'Park Ave, NY' },
        status: HazardReport_1.ReportStatus.Assigned,
        statusHistory: [
            { status: HazardReport_1.ReportStatus.Submitted, changedBy: '6707f1a10000000000000001', timestamp: new Date('2026-10-11T10:00:00Z') },
            { status: HazardReport_1.ReportStatus.UnderReview, changedBy: '6707f1a10000000000000002', timestamp: new Date('2026-10-11T10:30:00Z') },
            { status: HazardReport_1.ReportStatus.Assigned, changedBy: '6707f1a10000000000000002', timestamp: new Date('2026-10-11T11:00:00Z'), note: 'Assigned to Bob' }
        ],
        createdAt: new Date('2026-10-11T10:00:00Z'),
        updatedAt: new Date('2026-10-11T11:00:00Z')
    }
];
class DemoDataStore {
    users = [...initialUsers];
    reports = [...initialReports];
    getUserByEmail(email) {
        const normalized = email.trim().toLowerCase();
        return this.users.find(u => u.email.toLowerCase() === normalized);
    }
    getUserById(id) {
        return this.users.find(u => u._id === id || String(u._id) === String(id));
    }
    createUser(name, email, passwordHash) {
        const user = {
            _id: (0, uuid_1.v4)().replace(/-/g, '').slice(0, 24),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            passwordHash,
            role: User_1.UserRole.Citizen,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.users.push(user);
        return user;
    }
    getCrewMembers() {
        return this.users
            .filter(u => u.role === User_1.UserRole.Crew)
            .map(u => ({ _id: u._id, name: u.name, email: u.email, role: u.role }));
    }
    createReport(data) {
        const now = new Date();
        const citizen = this.getUserById(data.citizen?._id || data.citizen) || {
            _id: String(data.citizen),
            name: 'Demo Citizen',
            email: 'citizen@civora.com'
        };
        const newReport = {
            _id: (0, uuid_1.v4)().replace(/-/g, '').slice(0, 24),
            reportId: data.reportId || `REP-${(0, uuid_1.v4)().split('-')[0].toUpperCase()}`,
            citizen: { _id: citizen._id, name: citizen.name, email: citizen.email },
            imageUrl: data.imageUrl || '',
            hazardCategory: data.hazardCategory || 'Pothole',
            description: data.description,
            aiDetections: data.aiDetections || [],
            modelMetadata: data.modelMetadata,
            aiSeverityRecommendation: data.aiSeverityRecommendation,
            finalSeverityScore: data.finalSeverityScore || 50,
            severityLabel: data.severityLabel || HazardReport_1.SeverityLabel.Medium,
            location: data.location || { coordinates: [0, 0] },
            status: data.status || HazardReport_1.ReportStatus.Submitted,
            statusHistory: data.statusHistory || [{
                    status: HazardReport_1.ReportStatus.Submitted,
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
    getReports(options) {
        let filtered = [...this.reports];
        if (options.role === 'Citizen') {
            filtered = filtered.filter(r => {
                const cId = r.citizen?._id ? String(r.citizen._id) : String(r.citizen);
                return cId === String(options.userId);
            });
        }
        else if (options.role === 'Crew') {
            filtered = filtered.filter(r => {
                const crId = r.assignedCrew?._id ? String(r.assignedCrew._id) : String(r.assignedCrew);
                return crId === String(options.userId);
            });
        }
        if (options.status && options.status !== 'ALL') {
            filtered = filtered.filter(r => r.status === options.status);
        }
        else if (options.unresolved) {
            filtered = filtered.filter(r => r.status !== HazardReport_1.ReportStatus.Resolved &&
                r.status !== HazardReport_1.ReportStatus.Rejected &&
                r.status !== HazardReport_1.ReportStatus.Duplicate);
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
                if (a.finalSeverityScore !== b.finalSeverityScore)
                    return a.finalSeverityScore - b.finalSeverityScore;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            else if (options.sort === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            else if (options.sort === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            else {
                // Default: Severity score DESC, oldest tiebreaker
                if (b.finalSeverityScore !== a.finalSeverityScore)
                    return b.finalSeverityScore - a.finalSeverityScore;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
        });
        return filtered;
    }
    getReportById(id) {
        return this.reports.find(r => r._id === id || r.reportId === id);
    }
    updateReport(id, updates) {
        const report = this.getReportById(id);
        if (!report)
            return undefined;
        Object.assign(report, updates, { updatedAt: new Date() });
        return report;
    }
    getDashboardStats() {
        const total = this.reports.length;
        const pending = this.reports.filter(r => r.status === HazardReport_1.ReportStatus.Submitted || r.status === HazardReport_1.ReportStatus.UnderReview).length;
        const critical = this.reports.filter(r => r.severityLabel === HazardReport_1.SeverityLabel.Critical).length;
        const resolved = this.reports.filter(r => r.status === HazardReport_1.ReportStatus.Resolved).length;
        return { total, pending, critical, resolved };
    }
}
exports.demoStore = new DemoDataStore();
