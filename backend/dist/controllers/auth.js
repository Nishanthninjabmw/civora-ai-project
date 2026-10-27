"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCrewMembers = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const demoStore_1 = require("../services/demoStore");
const generateToken = (id, role) => {
    return jsonwebtoken_1.default.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        // Use live MongoDB Atlas if connected, otherwise fallback to in-memory demoStore
        if (mongoose_1.default.connection.readyState === 1) {
            const userExists = await User_1.User.findOne({ email: normalizedEmail });
            if (userExists) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            const user = await User_1.User.create({
                name: String(name).trim(),
                email: normalizedEmail,
                passwordHash,
                role: User_1.UserRole.Citizen
            });
            return res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        }
        else {
            const existing = demoStore_1.demoStore.getUserByEmail(normalizedEmail);
            if (existing) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            const user = demoStore_1.demoStore.createUser(name, normalizedEmail, passwordHash);
            return res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        }
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        // Use live MongoDB Atlas if connected, otherwise fallback to in-memory demoStore
        if (mongoose_1.default.connection.readyState === 1) {
            const user = await User_1.User.findOne({ email: normalizedEmail });
            if (user && (await bcryptjs_1.default.compare(password, user.passwordHash))) {
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
        else {
            const user = demoStore_1.demoStore.getUserByEmail(normalizedEmail);
            if (user && (await bcryptjs_1.default.compare(password, user.passwordHash))) {
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (mongoose_1.default.connection.readyState === 1) {
            const user = await User_1.User.findById(userId).select('-passwordHash');
            if (user) {
                return res.json(user);
            }
            return res.status(404).json({ message: 'User not found' });
        }
        else {
            const user = demoStore_1.demoStore.getUserById(String(userId));
            if (user) {
                const { passwordHash, ...userClean } = user;
                return res.json(userClean);
            }
            return res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMe = getMe;
const getCrewMembers = async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            const crewMembers = await User_1.User.find({ role: User_1.UserRole.Crew }).select('_id name email role');
            return res.json(crewMembers);
        }
        else {
            return res.json(demoStore_1.demoStore.getCrewMembers());
        }
    }
    catch (error) {
        console.error('Error fetching crew members:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getCrewMembers = getCrewMembers;
