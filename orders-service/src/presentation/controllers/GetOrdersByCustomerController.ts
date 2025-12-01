import { GetOrdersByCustomerUseCase } from '@application/use-cases/GetOrdersByCustomerUseCase.js';
import type {
  HttpController,
  HttpRequest,
  HttpResponse,
} from '@presentation/http/HttpInterfaces.js';
import { ok, badRequest, serverError } from '@presentation/http/HttpHelpers.js';

/**
 * Get Orders By Customer Controller
 * Handles HTTP requests for retrieving orders by customer ID
 */
export class GetOrdersByCustomerController implements HttpController {
  constructor(private getOrdersByCustomerUseCase: GetOrdersByCustomerUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      const { customerId } = request.query;

      if (!customerId) {
        return badRequest('Customer ID is required');
      }

      const result = await this.getOrdersByCustomerUseCase.execute(customerId);

      return ok(result);
    } catch (error) {
      if (error instanceof Error) {
        return serverError(error.message);
      }

      return serverError('An unexpected error occurred');
    }
  }
}
