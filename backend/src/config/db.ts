import mongoose from 'mongoose';

let isConnecting = false;

export const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    isConnecting = false;
  } catch (error: any) {
    isConnecting = false;
    console.warn(`MongoDB Atlas Connection Notice: ${error.message}`);
    console.warn('Note: In MongoDB Atlas, ensure Network Access allows your current IP or 0.0.0.0/0. Retrying connection in background...');
    setTimeout(connectDB, 10000);
  }
};
