import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Middleware to validate request body against a Zod schema
 */
export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize strings: trim whitespace
      const sanitizedBody = sanitizeObject(req.body);

      // Validate against schema
      req.body = await schema.parseAsync(sanitizedBody);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues;
        const errors = issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors,
          },
        });
      }

      next(error);
    }
  };
}

/**
 * Middleware to validate query parameters against a Zod schema
 */
export function validateQuery(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert query params to appropriate types
      const sanitizedQuery = sanitizeObject(req.query);
      req.query = (await schema.parseAsync(sanitizedQuery)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues;
        const errors = issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors,
          },
        });
      }

      next(error);
    }
  };
}

/**
 * Middleware to validate route parameters against a Zod schema
 */
export function validateParams(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = (await schema.parseAsync(req.params)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues;
        const errors = issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid route parameters',
            details: errors,
          },
        });
      }

      next(error);
    }
  };
}

/**
 * Recursively sanitize an object by trimming strings and escaping HTML
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a string by trimming and escaping HTML
 */
function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
