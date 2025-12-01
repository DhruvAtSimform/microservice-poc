import { GetOrderByIdUseCase } from '@application/use-cases/GetOrderByIdUseCase.js';
import type {
  HttpController,
  HttpRequest,
  HttpResponse,
} from '@presentation/http/HttpInterfaces.js';
import { ok, notFound, serverError } from '@presentation/http/HttpHelpers.js';
import { OrderNotFoundError } from '@shared/errors/DomainError.js';

/**
 * Get Order By ID Controller
 * Handles HTTP requests for retrieving an order by ID
 */
export class GetOrderByIdController implements HttpController {
  constructor(private getOrderByIdUseCase: GetOrderByIdUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      const { id } = request.params;

      if (!id) {
        return notFound('Order ID is required');
      }

      const result = await this.getOrderByIdUseCase.execute(id);

      return ok(result);
    } catch (error) {
      if (error instanceof OrderNotFoundError) {
        return notFound(error.message);
      }

      if (error instanceof Error) {
        return serverError(error.message);
      }

      return serverError('An unexpected error occurred');
    }
  }
}
