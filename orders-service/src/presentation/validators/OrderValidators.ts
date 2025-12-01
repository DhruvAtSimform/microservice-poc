import { z } from 'zod';

/**
 * Zod schema for order item
 */
export const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

/**
 * Zod schema for creating an order
 */
export const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  items: z
    .array(orderItemSchema)
    .min(1, 'Order must have at least one item')
    .max(50, 'Order cannot have more than 50 items'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Zod schema for order ID parameter
 */
export const orderIdSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

export type OrderIdParam = z.infer<typeof orderIdSchema>;

/**
 * Zod schema for customer ID query parameter
 */
export const customerIdQuerySchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
});

export type CustomerIdQuery = z.infer<typeof customerIdQuerySchema>;
