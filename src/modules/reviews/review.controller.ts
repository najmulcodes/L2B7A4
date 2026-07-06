import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import * as reviewService from './review.service';
import type { CreateReviewInput, ListReviewsQuery } from './review.validation';

export async function createReviewHandler(req: Request, res: Response): Promise<void> {
  const review = await reviewService.createReview(req.user!.id, req.body as CreateReviewInput);
  sendSuccess(res, 201, 'Review submitted successfully. / রিভিউ সফলভাবে জমা হয়েছে।', review);
}

export async function listReviewsHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListReviewsQuery;
  const { items, meta } = await reviewService.listReviews(query);
  sendSuccess(res, 200, 'Reviews fetched successfully.', items, meta);
}

export async function deleteReviewHandler(req: Request, res: Response): Promise<void> {
  await reviewService.deleteReview(req.params.id as string, req.user!);
  sendSuccess(res, 200, 'Review deleted successfully.');
}
