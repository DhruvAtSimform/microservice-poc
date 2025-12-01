import { ProductId } from '@domain/value-objects/ProductId.js';
import { Money } from '@domain/value-objects/Money.js';

/**
 * Product Entity - Core Domain Model
 * Represents the product aggregate root
 */
export class Product {
  constructor(
    private readonly _id: ProductId,
    private _name: string,
    private _description: string,
    private _price: Money,
    private _stock: number,
    private _isActive: boolean = true
  ) {}

  get id(): ProductId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get price(): Money {
    return this._price;
  }

  get stock(): number {
    return this._stock;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // Business logic methods
  updatePrice(newPrice: Money): void {
    this._price = newPrice;
  }

  updateStock(quantity: number): void {
    if (this._stock + quantity < 0) {
      throw new Error('Insufficient stock');
    }
    this._stock += quantity;
  }

  deactivate(): void {
    this._isActive = false;
  }

  activate(): void {
    this._isActive = true;
  }

  canFulfillOrder(quantity: number): boolean {
    return this._isActive && this._stock >= quantity;
  }
}
