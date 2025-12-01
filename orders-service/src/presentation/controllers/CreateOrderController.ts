import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import type {
  HttpController,
  HttpRequest,
  HttpResponse,
} from '@presentation/http/HttpInterfaces.js';
import {
  validateRequest,
  created,
  badRequest,
  serverError,
  ValidationError,
} from '@presentation/http/HttpHelpers.js';
import { createOrderSchema } from '@presentation/validators/OrderValidators.js';
import { DomainError } from '@shared/errors/DomainError.js';

/**
 * Create Order Controller
 * Handles HTTP requests for order creation
 * Framework-agnostic using HttpController interface
 */
export class CreateOrderController implements HttpController {
  constructor(private createOrderUseCase: CreateOrderUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      // Validate request body
      const validatedData = await validateRequest(request, createOrderSchema);

      // Execute use case
      const result = await this.createOrderUseCase.execute(validatedData);

      // Return success response
      return created(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return badRequest('Validation failed', error.errors.format());
      }

      if (error instanceof DomainError) {
        return badRequest(error.message);
      }

      if (error instanceof Error) {
        return serverError(error.message);
      }

      return serverError('An unexpected error occurred');
    }
  }
}
