/**
 * Reserve Product Command
 * Used in SAGA pattern for order orchestration
 */
export class ReserveProductCommand {
  constructor(
    public readonly orderId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly sagaId: string
  ) {}
}
