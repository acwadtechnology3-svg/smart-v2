import { Request, Response, NextFunction } from 'express';

type Role = 'customer' | 'driver' | 'admin';

/**
 * Middleware to require specific role(s) for access
 * Must be used after authenticate middleware
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
      });
    }

    next();
  };
}

/**
 * Middleware to require customer role
 */
export const requireCustomer = requireRole('customer');

/**
 * Middleware to require driver role
 */
export const requireDriver = requireRole('driver');

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require either customer or driver role
 */
export const requireUser = requireRole('customer', 'driver');

/**
 * Middleware to ensure user can only access their own resources
 */
export function requireOwnership(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];

    // Admins can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership
    if (req.user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own resources',
        },
      });
    }

    next();
  };
}
