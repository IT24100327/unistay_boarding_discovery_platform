import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { sendSuccess } from '../utils/response';
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../utils/AppError';
import { CreateReviewInput } from '../validators/review.validators';
import { ReservationStatus } from '@prisma/client';

// POST /api/v1/reviews  (student)
export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.userId;
    const body = req.body as CreateReviewInput;

    const reservation = await prisma.reservation.findUnique({
      where: { id: body.reservationId },
      include: { review: true },
    });
    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.studentId !== studentId) throw new ForbiddenError('This is not your reservation');
    if (reservation.status !== ReservationStatus.COMPLETED) {
      throw new BadRequestError('Reviews can only be written for COMPLETED reservations');
    }
    if (reservation.review) {
      throw new ConflictError('A review already exists for this reservation');
    }

    const review = await prisma.review.create({
      data: {
        reservationId: body.reservationId,
        studentId,
        boardingId: reservation.boardingId,
        rating: body.rating,
        comment: body.comment,
      },
      select: {
        id: true,
        reservationId: true,
        studentId: true,
        boardingId: true,
        rating: true,
        comment: true,
        createdAt: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    sendSuccess(res, { review }, 'Review submitted successfully', 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/boardings/:id/reviews  (public)
export async function getBoardingReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const reviews = await prisma.review.findMany({
      where: { boardingId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reservationId: true,
        studentId: true,
        boardingId: true,
        rating: true,
        comment: true,
        createdAt: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    sendSuccess(res, { reviews });
  } catch (err) {
    next(err);
  }
}
