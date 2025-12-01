import { GetAllProductsUseCase } from '@application/use-cases/GetAllProductsUseCase.js';
import type {
  HttpController,
  HttpRequest,
  HttpResponse,
} from '@presentation/http/HttpInterfaces.js';
import { ok, serverError } from '@presentation/http/HttpHelpers.js';

/**
 * Get All Products Controller
 * Delegates to GetAllProductsUseCase
 */
export class GetAllProductsController implements HttpController {
  constructor(private getAllProductsUseCase: GetAllProductsUseCase) {}

  async handle(_request: HttpRequest): Promise<HttpResponse> {
    try {
      const products = await this.getAllProductsUseCase.execute();
      return ok(products);
    } catch (error) {
      if (error instanceof Error) {
        return serverError(error.message);
      }
      return serverError('An unexpected error occurred');
    }
  }
}
