import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadProfileImageMiddleware } from '../middleware/upload';
import {
  getMe,
  updateMe,
  changePassword,
  uploadProfileImageHandler,
} from '../controllers/user.controller';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.validators';

const router = Router();

const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
});

router.use(userLimiter, authenticate);

router.get('/me', getMe);
router.put('/me', validate(updateProfileSchema), updateMe);
router.put('/me/password', validate(changePasswordSchema), changePassword);
router.put('/me/profile-image', uploadProfileImageMiddleware, uploadProfileImageHandler);

export default router;
