import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  Citizen = 'Citizen',
  Admin = 'Admin',
  Crew = 'Crew'
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.Citizen }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
