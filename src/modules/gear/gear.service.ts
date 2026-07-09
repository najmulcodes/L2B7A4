import { Prisma } from "@prisma/client";
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { resolvePagination, buildPaginationMeta } from '../../utils/pagination';
import type { PaginationMeta } from '../../utils/ApiResponse';
import type {
  CreateGearInput,
  UpdateGearInput,
  ListGearQuery,
  ListMyGearQuery,
} from './gear.validation';

const PROVIDER_PREVIEW_SELECT = {
  id: true,
  name: true,
  businessName: true,
  avatarUrl: true,
} as const;

const CATEGORY_PREVIEW_SELECT = {
  id: true,
  name: true,
  slug: true,
} as const;

function buildOrderBy(sortBy: ListGearQuery['sortBy']): Prisma.GearItemOrderByWithRelationInput {
  switch (sortBy) {
    case 'price_asc':
      return { pricePerDay: 'asc' };
    case 'price_desc':
      return { pricePerDay: 'desc' };
    case 'rating':
      return { avgRating: 'desc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

export async function listGear(
  query: ListGearQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);

  const where: Prisma.GearItemWhereInput = {
    isActive: true,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.brand ? { brand: { contains: query.brand, mode: 'insensitive' } } : {}),
    ...(query.location ? { location: { contains: query.location, mode: 'insensitive' } } : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.availableOnly ? { quantityAvailable: { gt: 0 } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          pricePerDay: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { brand: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.gearItem.findMany({
      where,
      orderBy: buildOrderBy(query.sortBy),
      skip,
      take,
      include: {
        category: { select: CATEGORY_PREVIEW_SELECT },
        provider: { select: PROVIDER_PREVIEW_SELECT },
      },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getGearById(id: string) {
  const gear = await prisma.gearItem.findUnique({
    where: { id },
    include: {
      category: { select: CATEGORY_PREVIEW_SELECT },
      provider: { select: PROVIDER_PREVIEW_SELECT },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: { select: { name: true, avatarUrl: true } } },
      },
    },
  });

  if (!gear || !gear.isActive) {
    throw ApiError.notFound('Gear item not found.');
  }
  return gear;
}

/** Same lookup as getGearById but does not hide inactive items - used by the
 * owning provider so they can still see/manage gear they've deactivated. */
async function getOwnedGearOrThrow(id: string, providerId: string) {
  const gear = await prisma.gearItem.findUnique({ where: { id } });
  if (!gear) throw ApiError.notFound('Gear item not found.');
  if (gear.providerId !== providerId) {
    throw ApiError.forbidden('You can only manage gear items you own.');
  }
  return gear;
}

export async function createGear(providerId: string, input: CreateGearInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category || !category.isActive) {
    throw ApiError.badRequest('The selected category does not exist or is inactive.', [
      { field: 'categoryId', message: 'Invalid category.' },
    ]);
  }

  return prisma.gearItem.create({
    data: {
      providerId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      brand: input.brand,
      images: input.images,
      pricePerDay: input.pricePerDay,
      securityDeposit: input.securityDeposit,
      quantityTotal: input.quantityTotal,
      quantityAvailable: input.quantityTotal,
      condition: input.condition,
      location: input.location,
      specifications: input.specifications as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function updateGear(id: string, providerId: string, input: UpdateGearInput) {
  const existing = await getOwnedGearOrThrow(id, providerId);

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category || !category.isActive) {
      throw ApiError.badRequest('The selected category does not exist or is inactive.', [
        { field: 'categoryId', message: 'Invalid category.' },
      ]);
    }
  }

  // Keep quantityAvailable in sync when the provider changes total inventory,
  // without ever letting it drop below zero (e.g. if more units are
  // currently rented out than the new total allows).
  let quantityAvailable: number | undefined;
  if (input.quantityTotal !== undefined && input.quantityTotal !== existing.quantityTotal) {
    const delta = input.quantityTotal - existing.quantityTotal;
    quantityAvailable = Math.max(0, existing.quantityAvailable + delta);
  }

  return prisma.gearItem.update({
    where: { id },
    data: {
      ...input,
      specifications: input.specifications as Prisma.InputJsonValue | undefined,
      ...(quantityAvailable !== undefined ? { quantityAvailable } : {}),
    },
  });
}

/** Soft delete - preserves history for any existing rental orders. */
export async function deleteGear(id: string, providerId: string): Promise<void> {
  await getOwnedGearOrThrow(id, providerId);
  await prisma.gearItem.update({ where: { id }, data: { isActive: false } });
}

export async function listMyGear(
  providerId: string,
  query: ListMyGearQuery,
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { skip, take, page, limit } = resolvePagination(query.page, query.limit);

  const where: Prisma.GearItemWhereInput = {
    providerId,
    ...(query.status === 'active' ? { isActive: true } : {}),
    ...(query.status === 'inactive' ? { isActive: false } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.gearItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { category: { select: CATEGORY_PREVIEW_SELECT } },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}
