"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let isConnecting = false;
const connectDB = async () => {
    if (isConnecting || mongoose_1.default.connection.readyState === 1)
        return;
    isConnecting = true;
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        isConnecting = false;
    }
    catch (error) {
        isConnecting = false;
        console.warn(`MongoDB Atlas Connection Notice: ${error.message}`);
        console.warn('Note: In MongoDB Atlas, ensure Network Access allows your current IP or 0.0.0.0/0. Retrying connection in background...');
        setTimeout(exports.connectDB, 10000);
    }
};
exports.connectDB = connectDB;
