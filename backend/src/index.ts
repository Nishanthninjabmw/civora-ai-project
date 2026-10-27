import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import reportRoutes from './routes/reports';

dotenv.config();

import path from 'path';

const app = express();

// Enable full CORS support for mobile Capacitor apps, localhost, and web clients
app.use(cors({
  origin: true, // Dynamically reflects request origin (allows capacitor://localhost, http://localhost, LAN IPs, and web)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());

import fs from 'fs';

// Serve local uploaded images statically
const primaryUploads = path.join(process.cwd(), 'uploads');
const fallbackUploads = path.join(__dirname, '../uploads');
const uploadsDir = fs.existsSync(primaryUploads) ? primaryUploads : fallbackUploads;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'CIVORA API is running',
    port: PORT,
    database: isDbConnected ? 'connected (Atlas)' : 'demo_fallback_active (Atlas IP not whitelisted)'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. On macOS, port 5000 is reserved by AirPlay Receiver. Set PORT=5001 in .env.`);
    } else {
      console.error(`Server error: ${err.message}`);
    }
  });

  if (process.env.MONGODB_URI) {
    connectDB();
  } else {
    console.warn("MONGODB_URI not set. Running without DB for now.");
  }
};

startServer();
