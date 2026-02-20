import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  logoutSchema,
} from '../validators/auth.validators';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many login attempts. Please try again after 1 minute.',
    timestamp: new Date().toISOString(),
  },
});

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);
router.post('/logout', validate(logoutSchema), logout);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), resendVerification);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;
