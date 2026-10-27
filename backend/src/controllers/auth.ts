import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, UserRole } from '../models/User';
import { demoStore } from '../services/demoStore';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Use live MongoDB Atlas if connected, otherwise fallback to in-memory demoStore
    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
        role: UserRole.Citizen
      });

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id as any as string, user.role),
      });
    } else {
      const existing = demoStore.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const user = demoStore.createUser(name, normalizedEmail, passwordHash);

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Use live MongoDB Atlas if connected, otherwise fallback to in-memory demoStore
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: normalizedEmail });
      if (user && (await bcrypt.compare(password, user.passwordHash))) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id as any as string, user.role),
        });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    } else {
      const user = demoStore.getUserByEmail(normalizedEmail);
      if (user && (await bcrypt.compare(password, user.passwordHash))) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id, user.role),
        });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId).select('-passwordHash');
      if (user) {
        return res.json(user);
      }
      return res.status(404).json({ message: 'User not found' });
    } else {
      const user = demoStore.getUserById(String(userId));
      if (user) {
        const { passwordHash, ...userClean } = user;
        return res.json(userClean);
      }
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCrewMembers = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const crewMembers = await User.find({ role: UserRole.Crew }).select('_id name email role');
      return res.json(crewMembers);
    } else {
      return res.json(demoStore.getCrewMembers());
    }
  } catch (error: any) {
    console.error('Error fetching crew members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
