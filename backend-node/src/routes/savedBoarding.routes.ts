import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth';
import {
  saveBoarding,
  unsaveBoarding,
  getSavedBoardings,
} from '../controllers/savedBoarding.controller';

const router = Router();

const savedBoardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
});

router.use(savedBoardingLimiter, authenticate, requireRole('STUDENT'));

router.get('/', getSavedBoardings);
router.post('/:boardingId', saveBoarding);
router.delete('/:boardingId', unsaveBoarding);

export default router;
