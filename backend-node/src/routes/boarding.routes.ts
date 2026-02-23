import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { uploadBoardingImageMiddleware } from '../middleware/upload';
import {
  searchBoardings,
  getBoardingBySlug,
  createBoarding,
  updateBoarding,
  submitBoarding,
  deactivateBoarding,
  activateBoarding,
  getMyListings,
  uploadImages,
  deleteImage,
} from '../controllers/boarding.controller';
import { getBoardingReviews } from '../controllers/review.controller';
import {
  createBoardingSchema,
  updateBoardingSchema,
  searchBoardingsQuerySchema,
} from '../validators/boarding.validators';

const router = Router();

const boardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
});

router.use(boardingLimiter);

// Public routes
router.get('/', validateQuery(searchBoardingsQuerySchema), searchBoardings);

// Owner-only routes (must come before /:slug to avoid conflict)
router.get('/my-listings', authenticate, requireRole('OWNER'), getMyListings);

router.post('/', authenticate, requireRole('OWNER'), validate(createBoardingSchema), createBoarding);
router.put('/:id', authenticate, requireRole('OWNER'), validate(updateBoardingSchema), updateBoarding);
router.patch('/:id/submit', authenticate, requireRole('OWNER'), submitBoarding);
router.patch('/:id/deactivate', authenticate, requireRole('OWNER'), deactivateBoarding);
router.patch('/:id/activate', authenticate, requireRole('OWNER'), activateBoarding);
router.post('/:id/images', authenticate, requireRole('OWNER'), uploadBoardingImageMiddleware, uploadImages);
router.delete('/:id/images/:imageId', authenticate, requireRole('OWNER'), deleteImage);

// Public slug route (after all specific paths)
router.get('/:slug', getBoardingBySlug);

// Reviews for a boarding (public, uses boarding id)
router.get('/:id/reviews', getBoardingReviews);

export default router;
