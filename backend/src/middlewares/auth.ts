import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { demoStore } from '../services/demoStore';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    try {
      token = authHeader.split(/\s+/)[1];
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      if (mongoose.connection.readyState === 1) {
        (req as any).user = await User.findById(decoded.id).select('-passwordHash');
      } else {
        const fallbackUser = demoStore.getUserById(decoded.id);
        if (fallbackUser) {
          const { passwordHash, ...userWithoutPass } = fallbackUser;
          (req as any).user = userWithoutPass;
        }
      }
      if (!(req as any).user) {
        return res.status(401).json({ message: 'User not found or deactivated' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const adminCheck = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user && (req as any).user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const crewOrAdminCheck = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user && ((req as any).user.role === 'Admin' || (req as any).user.role === 'Crew')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized for this action' });
  }
};
