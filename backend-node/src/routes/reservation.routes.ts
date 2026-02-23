import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createReservation,
  getMyRequests,
  getMyBoardingRequests,
  getReservationById,
  approveReservation,
  rejectReservation,
  cancelReservation,
  completeReservation,
} from '../controllers/reservation.controller';
import { getRentalPeriods } from '../controllers/rentalPeriod.controller';
import {
  createReservationSchema,
  rejectReservationSchema,
} from '../validators/reservation.validators';

const router = Router();

const reservationLimiter = rateLimit({
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

router.use(reservationLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validate(createReservationSchema), createReservation);
router.get('/my-requests', authenticate, requireRole('STUDENT'), getMyRequests);
router.get('/my-boardings', authenticate, requireRole('OWNER'), getMyBoardingRequests);
router.get('/:id', authenticate, getReservationById);
router.patch('/:id/approve', authenticate, requireRole('OWNER'), approveReservation);
router.patch('/:id/reject', authenticate, requireRole('OWNER'), validate(rejectReservationSchema), rejectReservation);
router.patch('/:id/cancel', authenticate, requireRole('STUDENT'), cancelReservation);
router.patch('/:id/complete', authenticate, requireRole('OWNER'), completeReservation);
router.get('/:resId/rental-periods', authenticate, getRentalPeriods);

export default router;
