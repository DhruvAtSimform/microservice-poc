import type { Request, Response, NextFunction } from 'express';
import type { HttpRequest, HttpResponse, HttpController } from './HttpInterfaces.js';

/**
 * Express Adapter
 * Adapts Express request/response to framework-agnostic HTTP interfaces
 */
export class ExpressAdapter {
  /**
   * Adapt Express middleware to use HttpController
   */
  static adapt(controller: HttpController) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const httpRequest: HttpRequest = {
          body: req.body,
          params: req.params,
          query: req.query as Record<string, string>,
          headers: req.headers as Record<string, string>,
        };

        const httpResponse: HttpResponse = await controller.handle(httpRequest);

        if (httpResponse.headers) {
          Object.entries(httpResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }

        res.status(httpResponse.statusCode).json(httpResponse.body);
      } catch (error) {
        next(error);
      }
    };
  }
}
