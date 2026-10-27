"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("./config/db");
const auth_1 = __importDefault(require("./routes/auth"));
const reports_1 = __importDefault(require("./routes/reports"));
dotenv_1.default.config();
const PORT = process.env.PORT || 5001;
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Enable full CORS support for mobile Capacitor apps, localhost, and web clients
app.use((0, cors_1.default)({
    origin: true, // Dynamically reflects request origin (allows capacitor://localhost, http://localhost, LAN IPs, and web)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express_1.default.json());
const fs_1 = __importDefault(require("fs"));
// Serve local uploaded images statically
const primaryUploads = path_1.default.join(process.cwd(), 'uploads');
const fallbackUploads = path_1.default.join(__dirname, '../uploads');
const uploadsDir = fs_1.default.existsSync(primaryUploads) ? primaryUploads : fallbackUploads;
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
app.get('/api/health', (req, res) => {
    const isDbConnected = mongoose_1.default.connection.readyState === 1;
    res.json({
        status: 'CIVORA API is running',
        port: PORT,
        database: isDbConnected ? 'connected (Atlas)' : 'demo_fallback_active (Atlas IP not whitelisted)'
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/reports', reports_1.default);
const startServer = async () => {
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. On macOS, port 5000 is reserved by AirPlay Receiver. Set PORT=5001 in .env.`);
        }
        else {
            console.error(`Server error: ${err.message}`);
        }
    });
    if (process.env.MONGODB_URI) {
        (0, db_1.connectDB)();
    }
    else {
        console.warn("MONGODB_URI not set. Running without DB for now.");
    }
};
startServer();
