/**
 * Command for checking product inventory
 */
export interface CheckInventoryCommand {
  orderId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}
