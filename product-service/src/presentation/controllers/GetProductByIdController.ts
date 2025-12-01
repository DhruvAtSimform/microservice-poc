import { GetProductByIdUseCase } from '@application/use-cases/GetProductByIdUseCase.js';
import type {
  HttpController,
  HttpRequest,
  HttpResponse,
} from '@presentation/http/HttpInterfaces.js';
import { ok, notFound, badRequest, serverError } from '@presentation/http/HttpHelpers.js';

/**
 * Get Product By ID Controller
 * Delegates to GetProductByIdUseCase
 */
export class GetProductByIdController implements HttpController {
  constructor(private getProductByIdUseCase: GetProductByIdUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      const { id } = request.params;

      if (!id) {
        return badRequest('Product ID is required');
      }

      const product = await this.getProductByIdUseCase.execute(id);

      if (!product) {
        return notFound('Product not found');
      }

      return ok(product);
    } catch (error) {
      if (error instanceof Error) {
        return serverError(error.message);
      }
      return serverError('An unexpected error occurred');
    }
  }
}
