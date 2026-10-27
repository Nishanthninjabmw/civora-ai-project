"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crewOrAdminCheck = exports.adminCheck = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const demoStore_1 = require("../services/demoStore");
const protect = async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && /^Bearer\s+/i.test(authHeader)) {
        try {
            token = authHeader.split(/\s+/)[1];
            if (!token) {
                return res.status(401).json({ message: 'Not authorized, no token' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            if (mongoose_1.default.connection.readyState === 1) {
                req.user = await User_1.User.findById(decoded.id).select('-passwordHash');
            }
            else {
                const fallbackUser = demoStore_1.demoStore.getUserById(decoded.id);
                if (fallbackUser) {
                    const { passwordHash, ...userWithoutPass } = fallbackUser;
                    req.user = userWithoutPass;
                }
            }
            if (!req.user) {
                return res.status(401).json({ message: 'User not found or deactivated' });
            }
            return next();
        }
        catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};
exports.protect = protect;
const adminCheck = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};
exports.adminCheck = adminCheck;
const crewOrAdminCheck = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Crew')) {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized for this action' });
    }
};
exports.crewOrAdminCheck = crewOrAdminCheck;
