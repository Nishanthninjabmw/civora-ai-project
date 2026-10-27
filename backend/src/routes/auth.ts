import express from 'express';
import { register, login, getMe, getCrewMembers } from '../controllers/auth';
import { protect, adminCheck } from '../middlewares/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/crew', protect, adminCheck, getCrewMembers);

export default router;
