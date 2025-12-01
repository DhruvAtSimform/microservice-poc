/**
 * HTTP Request abstraction
 * Framework-agnostic interface for HTTP requests
 */
export interface HttpRequest<T = unknown> {
  body: T;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
}

/**
 * HTTP Response abstraction
 * Framework-agnostic interface for HTTP responses
 */
export interface HttpResponse<T = unknown> {
  statusCode: number;
  body: T;
  headers?: Record<string, string>;
}

/**
 * HTTP Controller interface
 * All controllers should implement this
 */
export interface HttpController {
  handle(request: HttpRequest): Promise<HttpResponse>;
}
