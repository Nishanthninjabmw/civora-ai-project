import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, UserRole } from './models/User';
import { HazardReport, ReportStatus, SeverityLabel } from './models/HazardReport';

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required to seed database.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for Seeding');
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    await connectDB();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const demoUsers = [
      { name: 'John Citizen', email: 'citizen@civora.com', role: UserRole.Citizen },
      { name: 'Admin Alice', email: 'admin@civora.com', role: UserRole.Admin },
      { name: 'Crew Bob', email: 'crew@civora.com', role: UserRole.Crew },
    ];

    const seededUsers: Record<string, any> = {};

    for (const demoUser of demoUsers) {
      const normalizedEmail = demoUser.email.toLowerCase().trim();
      const user = await User.findOneAndUpdate(
        { email: normalizedEmail },
        {
          $set: {
            name: demoUser.name,
            email: normalizedEmail,
            passwordHash,
            role: demoUser.role,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      seededUsers[demoUser.role] = user;
    }

    const citizen = seededUsers[UserRole.Citizen];
    const admin = seededUsers[UserRole.Admin];
    const crew = seededUsers[UserRole.Crew];

    // Safely upsert demo hazard reports without creating duplicate records
    await HazardReport.findOneAndUpdate(
      { reportId: 'REP-DEMO-POTHOLE' },
      {
        $set: {
          reportId: 'REP-DEMO-POTHOLE',
          citizen: citizen._id,
          imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=1000',
          hazardCategory: 'Pothole',
          description: 'Large pothole on Main St, very dangerous for bikes.',
          aiDetections: [{ class: 'pothole', confidence: 0.92, bbox: { x: 50, y: 50, width: 20, height: 20 } }],
          finalSeverityScore: 78,
          severityLabel: SeverityLabel.High,
          location: { coordinates: [-73.935242, 40.730610], address: 'Main St, NY' },
          status: ReportStatus.Submitted,
          statusHistory: [{ status: ReportStatus.Submitted, changedBy: citizen._id }]
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    await HazardReport.findOneAndUpdate(
      { reportId: 'REP-DEMO-GARBAGE' },
      {
        $set: {
          reportId: 'REP-DEMO-GARBAGE',
          citizen: citizen._id,
          imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1000',
          hazardCategory: 'Garbage',
          description: 'Illegal dumping near the park entrance.',
          aiDetections: [],
          finalSeverityScore: 30,
          severityLabel: SeverityLabel.Low,
          location: { coordinates: [-73.94, 40.74], address: 'Park Ave, NY' },
          status: ReportStatus.Assigned,
          assignedCrew: crew._id,
          statusHistory: [
            { status: ReportStatus.Submitted, changedBy: citizen._id },
            { status: ReportStatus.UnderReview, changedBy: admin._id },
            { status: ReportStatus.Assigned, changedBy: admin._id, note: 'Assigned to Bob' }
          ]
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    console.log('Demo accounts safely upserted:');
    console.log('- citizen@civora.com (Citizen)');
    console.log('- admin@civora.com (Admin)');
    console.log('- crew@civora.com (Crew)');
    console.log('Data Imported!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
