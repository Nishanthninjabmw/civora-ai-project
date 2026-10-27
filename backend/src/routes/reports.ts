import express, { Request, Response, NextFunction } from 'express';
import { createReport, getReports, getReportById, updateReportStatus, getDashboardStats } from '../controllers/reports';
import { protect, adminCheck, crewOrAdminCheck } from '../middlewares/auth';
import { upload } from '../services/upload';

const router = express.Router();

// Middleware to handle Multer upload errors gracefully for image or resolutionImage
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'resolutionImage', maxCount: 1 }
  ])(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Maximum allowed size is 5MB.' });
      }
      return res.status(400).json({ message: err.message || 'File upload error.' });
    }
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['resolutionImage'] && files['resolutionImage'].length > 0) {
        req.file = files['resolutionImage'][0];
      } else if (files['image'] && files['image'].length > 0) {
        req.file = files['image'][0];
      }
    }
    next();
  });
};

router.post('/', protect, handleUpload, createReport);
router.get('/', protect, getReports);
router.get('/stats', protect, adminCheck, getDashboardStats);
router.get('/:id', protect, getReportById);
router.put('/:id/status', protect, crewOrAdminCheck, handleUpload, updateReportStatus);

export default router;
