import { z } from 'zod';
import type { HttpRequest, HttpResponse } from './HttpInterfaces.js';

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate HTTP request using Zod schema
 */
export async function validateRequest<T>(request: HttpRequest, schema: z.ZodSchema<T>): Promise<T> {
  try {
    return await schema.parseAsync(request.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error);
    }
    throw error;
  }
}

/**
 * Create success response
 */
export function ok<T>(data: T): HttpResponse<T> {
  return {
    statusCode: 200,
    body: data,
  };
}

/**
 * Create created response
 */
export function created<T>(data: T): HttpResponse<T> {
  return {
    statusCode: 201,
    body: data,
  };
}

/**
 * Create bad request response
 */
export function badRequest(message: string, errors?: unknown): HttpResponse {
  return {
    statusCode: 400,
    body: {
      error: message,
      details: errors,
    },
  };
}

/**
 * Create not found response
 */
export function notFound(message: string): HttpResponse {
  return {
    statusCode: 404,
    body: {
      error: message,
    },
  };
}

/**
 * Create internal server error response
 */
export function serverError(message: string): HttpResponse {
  return {
    statusCode: 500,
    body: {
      error: message,
    },
  };
}
