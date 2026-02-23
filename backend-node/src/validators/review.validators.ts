import { z } from 'zod';

export const createReviewSchema = z.object({
  reservationId: z.string().min(1, 'reservationId is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(2000, 'Comment max 2000 characters').optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
