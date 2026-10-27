"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("./models/User");
const HazardReport_1 = require("./models/HazardReport");
dotenv_1.default.config();
const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is required to seed database.');
        }
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Seeding');
    }
    catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};
const importData = async () => {
    try {
        await connectDB();
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash('password123', salt);
        const demoUsers = [
            { name: 'John Citizen', email: 'citizen@civora.com', role: User_1.UserRole.Citizen },
            { name: 'Admin Alice', email: 'admin@civora.com', role: User_1.UserRole.Admin },
            { name: 'Crew Bob', email: 'crew@civora.com', role: User_1.UserRole.Crew },
        ];
        const seededUsers = {};
        for (const demoUser of demoUsers) {
            const normalizedEmail = demoUser.email.toLowerCase().trim();
            const user = await User_1.User.findOneAndUpdate({ email: normalizedEmail }, {
                $set: {
                    name: demoUser.name,
                    email: normalizedEmail,
                    passwordHash,
                    role: demoUser.role,
                },
            }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
            seededUsers[demoUser.role] = user;
        }
        const citizen = seededUsers[User_1.UserRole.Citizen];
        const admin = seededUsers[User_1.UserRole.Admin];
        const crew = seededUsers[User_1.UserRole.Crew];
        // Safely upsert demo hazard reports without creating duplicate records
        await HazardReport_1.HazardReport.findOneAndUpdate({ reportId: 'REP-DEMO-POTHOLE' }, {
            $set: {
                reportId: 'REP-DEMO-POTHOLE',
                citizen: citizen._id,
                imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=1000',
                hazardCategory: 'Pothole',
                description: 'Large pothole on Main St, very dangerous for bikes.',
                aiDetections: [{ class: 'pothole', confidence: 0.92, bbox: { x: 50, y: 50, width: 20, height: 20 } }],
                finalSeverityScore: 78,
                severityLabel: HazardReport_1.SeverityLabel.High,
                location: { coordinates: [-73.935242, 40.730610], address: 'Main St, NY' },
                status: HazardReport_1.ReportStatus.Submitted,
                statusHistory: [{ status: HazardReport_1.ReportStatus.Submitted, changedBy: citizen._id }]
            }
        }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
        await HazardReport_1.HazardReport.findOneAndUpdate({ reportId: 'REP-DEMO-GARBAGE' }, {
            $set: {
                reportId: 'REP-DEMO-GARBAGE',
                citizen: citizen._id,
                imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1000',
                hazardCategory: 'Garbage',
                description: 'Illegal dumping near the park entrance.',
                aiDetections: [],
                finalSeverityScore: 30,
                severityLabel: HazardReport_1.SeverityLabel.Low,
                location: { coordinates: [-73.94, 40.74], address: 'Park Ave, NY' },
                status: HazardReport_1.ReportStatus.Assigned,
                assignedCrew: crew._id,
                statusHistory: [
                    { status: HazardReport_1.ReportStatus.Submitted, changedBy: citizen._id },
                    { status: HazardReport_1.ReportStatus.UnderReview, changedBy: admin._id },
                    { status: HazardReport_1.ReportStatus.Assigned, changedBy: admin._id, note: 'Assigned to Bob' }
                ]
            }
        }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
        console.log('Demo accounts safely upserted:');
        console.log('- citizen@civora.com (Citizen)');
        console.log('- admin@civora.com (Admin)');
        console.log('- crew@civora.com (Crew)');
        console.log('Data Imported!');
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};
importData();
