import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createVisitRequest,
  getMyVisitRequests,
  getMyBoardingVisitRequests,
  getVisitRequestById,
  approveVisitRequest,
  rejectVisitRequest,
  cancelVisitRequest,
} from '../controllers/visitRequest.controller';
import {
  createVisitRequestSchema,
  rejectVisitRequestSchema,
} from '../validators/visitRequest.validators';

const router = Router();

const visitRequestLimiter = rateLimit({
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

router.use(visitRequestLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validate(createVisitRequestSchema), createVisitRequest);
router.get('/my-requests', authenticate, requireRole('STUDENT'), getMyVisitRequests);
router.get('/my-boardings', authenticate, requireRole('OWNER'), getMyBoardingVisitRequests);
router.get('/:id', authenticate, getVisitRequestById);
router.patch('/:id/approve', authenticate, requireRole('OWNER'), approveVisitRequest);
router.patch('/:id/reject', authenticate, requireRole('OWNER'), validate(rejectVisitRequestSchema), rejectVisitRequest);
router.patch('/:id/cancel', authenticate, requireRole('STUDENT'), cancelVisitRequest);

export default router;
