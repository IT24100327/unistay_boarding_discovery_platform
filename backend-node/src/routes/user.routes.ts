import { Router } from 'express';
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

router.use(authenticate);

router.get('/me', getMe);
router.put('/me', validate(updateProfileSchema), updateMe);
router.put('/me/password', validate(changePasswordSchema), changePassword);
router.put('/me/profile-image', uploadProfileImageMiddleware, uploadProfileImageHandler);

export default router;
