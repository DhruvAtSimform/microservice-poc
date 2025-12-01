/**
 * Data Transfer Object for creating a product
 */
export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  currency?: string;
  stock: number;
}
