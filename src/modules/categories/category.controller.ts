import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import * as categoryService from './category.service';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from './category.validation';

export async function listCategoriesHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListCategoriesQuery;
  const categories = await categoryService.listCategories(query);
  sendSuccess(res, 200, 'Categories fetched successfully.', categories);
}

export async function getCategoryHandler(req: Request, res: Response): Promise<void> {
  const category = await categoryService.getCategoryById(req.params.id as string);
  sendSuccess(res, 200, 'Category fetched successfully.', category);
}

export async function createCategoryHandler(req: Request, res: Response): Promise<void> {
  const category = await categoryService.createCategory(req.body as CreateCategoryInput);
  sendSuccess(res, 201, 'Category created successfully.', category);
}

export async function updateCategoryHandler(req: Request, res: Response): Promise<void> {
  const category = await categoryService.updateCategory(
    req.params.id as string,
    req.body as UpdateCategoryInput,
  );
  sendSuccess(res, 200, 'Category updated successfully.', category);
}

export async function deleteCategoryHandler(req: Request, res: Response): Promise<void> {
  await categoryService.deleteCategory(req.params.id as string);
  sendSuccess(res, 200, 'Category deleted successfully.');
}
