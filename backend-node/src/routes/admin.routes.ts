import { Router } from 'express';
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

router.use(authenticate, requireRole('ADMIN'));

router.get('/users', validateQuery(adminListUsersQuerySchema), listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/deactivate', deactivateUser);
router.patch('/users/:id/activate', activateUser);

export default router;
