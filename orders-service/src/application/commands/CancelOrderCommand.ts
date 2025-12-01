/**
 * Cancel Order Command
 * Command to cancel an order (compensation action)
 */
export interface CancelOrderCommand {
  orderId: string;
  reason: string;
  initiatedBy: string;
}
