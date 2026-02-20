import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { BoardingNotFoundError, ValidationError } from '../utils/AppError';
import { BoardingStatus } from '@prisma/client';

// POST /api/v1/saved-boardings/:boardingId  (student)
export async function saveBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardingId } = req.params as { boardingId: string };
    const studentId = req.user!.userId;

    const boarding = await prisma.boarding.findUnique({ where: { id: boardingId } });
    if (!boarding || boarding.isDeleted || boarding.status !== BoardingStatus.ACTIVE) {
      throw new BoardingNotFoundError();
    }

    const existing = await prisma.savedBoarding.findUnique({
      where: { boardingId_studentId: { boardingId, studentId } },
    });
    if (existing) {
      throw new ValidationError('Boarding is already saved');
    }

    const saved = await prisma.savedBoarding.create({
      data: { boardingId, studentId },
      select: { id: true, boardingId: true, studentId: true, createdAt: true },
    });

    sendSuccess(res, { saved }, 'Boarding saved successfully', 201);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/saved-boardings/:boardingId  (student)
export async function unsaveBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { boardingId } = req.params as { boardingId: string };
    const studentId = req.user!.userId;

    const existing = await prisma.savedBoarding.findUnique({
      where: { boardingId_studentId: { boardingId, studentId } },
    });
    if (!existing) {
      throw new BoardingNotFoundError('Saved boarding not found');
    }

    await prisma.savedBoarding.delete({
      where: { boardingId_studentId: { boardingId, studentId } },
    });

    sendSuccess(res, null, 'Boarding unsaved successfully');
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/saved-boardings  (student)
export async function getSavedBoardings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.userId;

    const saved = await prisma.savedBoarding.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        boarding: {
          select: {
            id: true,
            title: true,
            slug: true,
            city: true,
            district: true,
            monthlyRent: true,
            boardingType: true,
            genderPref: true,
            isFurnished: true,
            hasWifi: true,
            status: true,
            isDeleted: true,
            images: {
              select: { id: true, url: true },
              take: 1,
            },
          },
        },
      },
    });

    sendSuccess(res, { saved });
  } catch (err) {
    next(err);
  }
}
