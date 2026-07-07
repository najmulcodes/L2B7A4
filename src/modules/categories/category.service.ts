import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from './category.validation';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listCategories(query: ListCategoriesQuery) {
  return prisma.category.findMany({
    where: {
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw ApiError.notFound('Category not found.');
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  const baseSlug = slugify(input.name);
  const existingName = await prisma.category.findUnique({ where: { name: input.name } });
  if (existingName) {
    throw ApiError.conflict('A category with this name already exists.', [
      { field: 'name', message: 'This category name is already in use.' },
    ]);
  }

  // Guard against slug collisions from names that only differ by punctuation/case.
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  return prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      icon: input.icon,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategoryById(id);

  if (input.name) {
    const existingName = await prisma.category.findFirst({
      where: { name: input.name, NOT: { id } },
    });
    if (existingName) {
      throw ApiError.conflict('A category with this name already exists.', [
        { field: 'name', message: 'This category name is already in use.' },
      ]);
    }
  }

  return prisma.category.update({ where: { id }, data: input });
}

/** Soft delete - keeps referential integrity intact for gear items and
 * order history that already reference this category. */
export async function deleteCategory(id: string): Promise<void> {
  await getCategoryById(id);
  await prisma.category.update({ where: { id }, data: { isActive: false } });
}
