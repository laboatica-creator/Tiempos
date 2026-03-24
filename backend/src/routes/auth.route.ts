import { Router } from 'express';
import { registerUser, loginUser, forgotPassword, resetPassword, getFranchises } from '../controllers/auth.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/franchises', getFranchises);

// Admin-only route example to register other admins/franchises
router.post('/register-staff', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), registerUser);

export default router;
