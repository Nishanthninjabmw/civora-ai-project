import mongoose, { Document, Schema } from 'mongoose';

export enum ReportStatus {
  Submitted = 'Submitted',
  UnderReview = 'Under Review',
  Approved = 'Approved',
  Assigned = 'Assigned',
  InProgress = 'In Progress',
  Resolved = 'Resolved',
  Rejected = 'Rejected',
  Duplicate = 'Duplicate'
}

export enum SeverityLabel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export interface IHazardReport extends Document {
  reportId: string;
  citizen: mongoose.Types.ObjectId;
  imageUrl: string;
  hazardCategory: string;
  description?: string;
  aiDetections: Array<{
    class: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
  modelMetadata?: {
    modelId: string;
    inferenceTimeMs: number;
  };
  aiSeverityRecommendation?: number;
  finalSeverityScore: number;
  severityLabel: SeverityLabel;
  location: {
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
    accuracy?: number;
  };
  status: ReportStatus;
  assignedCrew?: mongoose.Types.ObjectId;
  adminNotes?: string;
  resolutionNotes?: string;
  resolutionImageUrl?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  statusHistory: Array<{
    status: ReportStatus;
    changedBy: mongoose.Types.ObjectId;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const HazardReportSchema: Schema = new Schema({
  reportId: { type: String, required: true, unique: true },
  citizen: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  hazardCategory: { type: String, required: true },
  description: { type: String },
  aiDetections: [{
    class: { type: String },
    confidence: { type: Number },
    bbox: {
      x: { type: Number },
      y: { type: Number },
      width: { type: Number },
      height: { type: Number }
    }
  }],
  modelMetadata: {
    modelId: { type: String },
    inferenceTimeMs: { type: Number }
  },
  aiSeverityRecommendation: { type: Number },
  finalSeverityScore: { type: Number, required: true },
  severityLabel: { type: String, enum: Object.values(SeverityLabel), required: true },
  location: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: { type: String },
    accuracy: { type: Number }
  },
  status: { type: String, enum: Object.values(ReportStatus), default: ReportStatus.Submitted },
  assignedCrew: { type: Schema.Types.ObjectId, ref: 'User' },
  adminNotes: { type: String },
  resolutionNotes: { type: String },
  resolutionImageUrl: { type: String },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  statusHistory: [{
    status: { type: String, enum: Object.values(ReportStatus) },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  }]
}, {
  timestamps: true
});

HazardReportSchema.index({ 'location.coordinates': '2dsphere' });

export const HazardReport = mongoose.model<IHazardReport>('HazardReport', HazardReportSchema);
