import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { UserNotFoundError, BoardingNotFoundError, InvalidStateTransitionError } from '../utils/AppError';
import { AdminListUsersQuery } from '../validators/user.validators';
import { RejectBoardingInput } from '../validators/boarding.validators';
import { Role, BoardingStatus } from '@prisma/client';

// GET /api/v1/admin/users
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, size, role, active } = req.query as unknown as AdminListUsersQuery;

    const where = {
      ...(role !== undefined && { role: role as Role }),
      ...(active !== undefined && { isActive: active }),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          university: true,
          nicNumber: true,
          profileImageUrl: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, {
      users,
      pagination: {
        total,
        page,
        size,
        totalPages: Math.ceil(total / size),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/users/:id
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        university: true,
        nicNumber: true,
        profileImageUrl: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new UserNotFoundError();

    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/users/:id/deactivate
export async function deactivateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new UserNotFoundError();

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    sendSuccess(res, { id: user.id, isActive: user.isActive }, 'User deactivated successfully');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/users/:id/activate
export async function activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new UserNotFoundError();

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    sendSuccess(res, { id: user.id, isActive: user.isActive }, 'User activated successfully');
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/boardings/pending
export async function listPendingBoardings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardings = await prisma.boarding.findMany({
      where: { status: BoardingStatus.PENDING_APPROVAL, isDeleted: false },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        ownerId: true,
        title: true,
        slug: true,
        city: true,
        district: true,
        monthlyRent: true,
        boardingType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        images: { select: { id: true, url: true }, take: 1 },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    sendSuccess(res, { boardings });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/boardings/:id/approve
export async function approveBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const existing = await prisma.boarding.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

    if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
      throw new InvalidStateTransitionError('Only PENDING_APPROVAL listings can be approved');
    }

    const boarding = await prisma.boarding.update({
      where: { id },
      data: { status: BoardingStatus.ACTIVE, rejectionReason: null },
      select: { id: true, status: true, title: true, updatedAt: true },
    });

    sendSuccess(res, { boarding }, 'Boarding approved successfully');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/boardings/:id/reject
export async function rejectBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body as RejectBoardingInput;

    const existing = await prisma.boarding.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

    if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
      throw new InvalidStateTransitionError('Only PENDING_APPROVAL listings can be rejected');
    }

    const boarding = await prisma.boarding.update({
      where: { id },
      data: { status: BoardingStatus.REJECTED, rejectionReason: reason },
      select: { id: true, status: true, title: true, rejectionReason: true, updatedAt: true },
    });

    sendSuccess(res, { boarding }, 'Boarding rejected successfully');
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/reservations
export async function listAllReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reservations = await prisma.reservation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        studentId: true,
        boardingId: true,
        status: true,
        moveInDate: true,
        rentSnapshot: true,
        rejectionReason: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        boarding: { select: { id: true, title: true, city: true, district: true } },
      },
    });

    sendSuccess(res, { reservations });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/payments/report
export async function getPaymentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [totalConfirmed, totalPending, overdueCount, byBoarding] = await prisma.$transaction([
      prisma.payment.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.rentalPeriod.count({ where: { status: 'OVERDUE' } }),
      prisma.rentalPeriod.groupBy({
        by: ['reservationId'],
        where: { status: { in: ['DUE', 'OVERDUE', 'PARTIALLY_PAID'] } },
        orderBy: { _sum: { amountDue: 'desc' } },
        _sum: { amountDue: true },
        _count: true,
      }),
    ]);

    sendSuccess(res, {
      confirmed: {
        count: totalConfirmed._count,
        total: totalConfirmed._sum.amount ?? 0,
      },
      pending: {
        count: totalPending._count,
        total: totalPending._sum.amount ?? 0,
      },
      overdueRentalPeriods: overdueCount,
      unpaidByReservation: byBoarding,
    });
  } catch (err) {
    next(err);
  }
}
