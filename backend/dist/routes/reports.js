"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reports_1 = require("../controllers/reports");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../services/upload");
const router = express_1.default.Router();
// Middleware to handle Multer upload errors gracefully for image or resolutionImage
const handleUpload = (req, res, next) => {
    upload_1.upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'resolutionImage', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File is too large. Maximum allowed size is 5MB.' });
            }
            return res.status(400).json({ message: err.message || 'File upload error.' });
        }
        const files = req.files;
        if (files) {
            if (files['resolutionImage'] && files['resolutionImage'].length > 0) {
                req.file = files['resolutionImage'][0];
            }
            else if (files['image'] && files['image'].length > 0) {
                req.file = files['image'][0];
            }
        }
        next();
    });
};
router.post('/', auth_1.protect, handleUpload, reports_1.createReport);
router.get('/', auth_1.protect, reports_1.getReports);
router.get('/stats', auth_1.protect, auth_1.adminCheck, reports_1.getDashboardStats);
router.get('/:id', auth_1.protect, reports_1.getReportById);
router.put('/:id/status', auth_1.protect, auth_1.crewOrAdminCheck, handleUpload, reports_1.updateReportStatus);
exports.default = router;
