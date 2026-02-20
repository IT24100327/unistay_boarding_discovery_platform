import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { config } from '../config/env';
import { sendSuccess } from '../utils/response';
import { uploadProfileImage } from '../utils/cloudinary';
import { UserNotFoundError, UnauthorizedError } from '../utils/AppError';
import { UpdateProfileInput, ChangePasswordInput } from '../validators/user.validators';
import { InvalidCredentialsError } from '../utils/AppError';

function sanitizeUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  university: string | null;
  nicNumber: string | null;
  profileImageUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    university: user.university,
    nicNumber: user.nicNumber,
    profileImageUrl: user.profileImageUrl,
    isVerified: user.isVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// GET /api/v1/users/me
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) throw new UserNotFoundError();

    sendSuccess(res, sanitizeUser(user));
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/users/me
export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const body = req.body as UpdateProfileInput;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.university !== undefined && { university: body.university }),
        ...(body.nicNumber !== undefined && { nicNumber: body.nicNumber }),
      },
    });

    sendSuccess(res, sanitizeUser(user), 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/users/me/password
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { currentPassword, newPassword } = req.body as ChangePasswordInput;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) throw new UserNotFoundError();

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new InvalidCredentialsError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/users/me/profile-image
export async function uploadProfileImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'No image file provided',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const imageUrl = await uploadProfileImage(req.file.buffer, req.file.mimetype);

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { profileImageUrl: imageUrl },
    });

    sendSuccess(res, { profileImageUrl: user.profileImageUrl }, 'Profile image updated');
  } catch (err) {
    next(err);
  }
}
