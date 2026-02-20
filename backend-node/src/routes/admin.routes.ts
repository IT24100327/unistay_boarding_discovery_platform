import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import {
  listUsers,
  getUserById,
  deactivateUser,
  activateUser,
} from '../controllers/admin.controller';
import { adminListUsersQuerySchema } from '../validators/user.validators';

const router = Router();

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

router.use(adminLimiter, authenticate, requireRole('ADMIN'));

router.get('/users', validateQuery(adminListUsersQuerySchema), listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/deactivate', deactivateUser);
router.patch('/users/:id/activate', activateUser);

export default router;
