/**
 * Data Transfer Object for product responses
 */
export interface ProductResponseDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  isActive: boolean;
}
