import { z } from 'zod';

/**
 * Zod schema for creating a product
 */
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().positive('Price must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  stock: z.number().int().nonnegative('Stock must be non-negative'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Zod schema for updating a product
 */
export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  stock: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Zod schema for product ID parameter
 */
export const productIdSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export type ProductIdParam = z.infer<typeof productIdSchema>;
