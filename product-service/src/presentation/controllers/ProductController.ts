import { CreateProductUseCase } from '@application/use-cases/CreateProductUseCase.js';
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
import { createProductSchema } from '@presentation/validators/ProductValidators.js';

/**
 * Product Controller
 * Handles HTTP requests for product operations
 * Framework-agnostic using HttpController interface
 */
export class CreateProductController implements HttpController {
  constructor(private createProductUseCase: CreateProductUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      // Validate request body
      const validatedData = await validateRequest(request, createProductSchema);

      // Execute use case
      const result = await this.createProductUseCase.execute(validatedData);

      // Return success response
      return created(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return badRequest('Validation failed', error.errors.format());
      }

      if (error instanceof Error) {
        return serverError(error.message);
      }

      return serverError('An unexpected error occurred');
    }
  }
}
