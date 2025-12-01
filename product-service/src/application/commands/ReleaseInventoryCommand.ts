/**
 * Release Inventory Command
 * Command to release previously reserved inventory (compensation action)
 */
export interface ReleaseInventoryCommand {
  orderId: string;
  productId: string;
  quantity: number;
  reservationId?: string;
  reason: string;
}
