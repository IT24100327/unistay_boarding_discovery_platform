import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { config } from '../config/env';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  parseDurationMs,
} from '../utils/jwt';
import { sha256, generateSecureToken } from '../utils/hash';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { sendSuccess } from '../utils/response';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  AccountDeactivatedError,
  TokenExpiredError,
  UserNotFoundError,
  UnauthorizedError,
} from '../utils/AppError';
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  LogoutInput,
} from '../validators/auth.validators';
import { Role } from '@prisma/client';

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as RegisterInput;

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new UserAlreadyExistsError();

    const passwordHash = await bcrypt.hash(body.password, config.bcrypt.saltRounds);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role as Role,
        phone: body.phone,
        university: body.university,
        nicNumber: body.nicNumber,
      },
    });

    // Create email verification token (24h)
    const rawToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.create({
      data: { token: rawToken, userId: user.id, expiresAt },
    });

    // Send verification email (fails gracefully if SMTP not configured)
    try {
      await sendVerificationEmail(user.email, user.firstName, rawToken);
    } catch (emailErr) {
      console.error('[Email] Failed to send verification email:', emailErr);
    }

    sendSuccess(
      res,
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
      'Registration successful. Please check your email to verify your account.',
      201,
    );
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new InvalidCredentialsError();

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) throw new InvalidCredentialsError();

    if (!user.isActive) throw new AccountDeactivatedError();

    // Generate tokens
    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = signAccessToken(payload);
    const rawRefreshToken = generateSecureToken(48);
    const tokenHash = sha256(rawRefreshToken);
    const expiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiry));

    await prisma.refreshToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    sendSuccess(res, {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: rawToken } = req.body as RefreshTokenInput;

    // Verify JWT signature first (to avoid DB lookup for obviously invalid tokens)
    let payload;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokenHash = sha256(rawToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt !== null) {
      throw new UnauthorizedError('Refresh token is invalid or revoked');
    }
    if (stored.expiresAt < new Date()) {
      throw new TokenExpiredError('Refresh token has expired');
    }

    // Rotation: revoke old token, issue new pair
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new UserNotFoundError();
    if (!user.isActive) throw new AccountDeactivatedError();

    const rawRefreshToken = generateSecureToken(48);
    const newTokenHash = sha256(rawRefreshToken);
    const newExpiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiry));

    // Create new token and revoke old one in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      const newRt = await tx.refreshToken.create({
        data: { tokenHash: newTokenHash, userId: user.id, expiresAt: newExpiresAt },
      });
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedByTokenId: newRt.id },
      });
    });

    const newAccessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email });

    sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: rawRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: rawToken } = req.body as LogoutInput;
    const tokenHash = sha256(rawToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/verify-email?token=...
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query as { token: string };
    if (!token) throw new TokenExpiredError('Verification token is missing');

    const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record) throw new TokenExpiredError('Invalid or expired verification token');
    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      throw new TokenExpiredError('Verification token has expired');
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    sendSuccess(res, null, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/resend-verification
export async function resendVerification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as ResendVerificationInput;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent user enumeration
    if (!user || user.isVerified) {
      sendSuccess(res, null, 'If that email exists and is unverified, a new link has been sent.');
      return;
    }

    // Revoke existing tokens
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const rawToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.create({
      data: { token: rawToken, userId: user.id, expiresAt },
    });

    try {
      await sendVerificationEmail(user.email, user.firstName, rawToken);
    } catch (emailErr) {
      console.error('[Email] Failed to send verification email:', emailErr);
    }

    sendSuccess(res, null, 'If that email exists and is unverified, a new link has been sent.');
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as ForgotPasswordInput;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent user enumeration
    if (!user) {
      sendSuccess(res, null, 'If that email is registered, a password reset link has been sent.');
      return;
    }

    // Invalidate existing reset tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.passwordResetToken.create({
      data: { token: rawToken, userId: user.id, expiresAt },
    });

    try {
      await sendPasswordResetEmail(user.email, user.firstName, rawToken);
    } catch (emailErr) {
      console.error('[Email] Failed to send password reset email:', emailErr);
    }

    sendSuccess(res, null, 'If that email is registered, a password reset link has been sent.');
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body as ResetPasswordInput;

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used) throw new TokenExpiredError('Invalid or expired reset token');
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      throw new TokenExpiredError('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
      // Revoke all refresh tokens for this user
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    sendSuccess(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
}
