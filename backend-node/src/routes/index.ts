import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import boardingRoutes from './boarding.routes';
import savedBoardingRoutes from './savedBoarding.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

router.use('/api/auth', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/admin', adminRoutes);
router.use('/api/v1/boardings', boardingRoutes);
router.use('/api/v1/saved-boardings', savedBoardingRoutes);

export default router;
