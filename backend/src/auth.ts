import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ApiError } from './errors.js';

export interface AuthenticatedRequest extends Request {
  authUser?: User;
  authClaims?: Record<string, unknown>;
  accessToken?: string;
}

function readVerifiedJwtClaims(token: string, userId: string): Record<string, unknown> | null {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) return null;

  try {
    const claims: unknown = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (
      !claims ||
      typeof claims !== 'object' ||
      !('sub' in claims) ||
      claims.sub !== userId ||
      !('role' in claims) ||
      claims.role !== 'authenticated'
    ) {
      return null;
    }
    return claims as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createAuthMiddleware(supabase: SupabaseClient) {
  return async (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      next(new ApiError(401, 'unauthorized', 'A valid bearer token is required.'));
      return;
    }
    const accessToken = match[1];
    if (!accessToken) {
      next(new ApiError(401, 'unauthorized', 'A valid bearer token is required.'));
      return;
    }

    try {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error) {
        const status = 'status' in error && typeof error.status === 'number' ? error.status : 0;
        if (status >= 500 || status === 429 || status === 0) {
          next(new ApiError(503, 'auth_service_unavailable', 'Authentication service is temporarily unavailable.'));
          return;
        }
        next(new ApiError(401, 'invalid_token', 'The access token is invalid or expired.'));
        return;
      }
      if (!data.user || !data.user.id) {
        next(new ApiError(401, 'invalid_token', 'The access token is invalid or expired.'));
        return;
      }
      const authClaims = readVerifiedJwtClaims(accessToken, data.user.id);
      if (!authClaims) {
        next(new ApiError(401, 'invalid_token', 'The access token claims are invalid.'));
        return;
      }
      request.authUser = data.user;
      request.authClaims = authClaims;
      request.accessToken = accessToken;
      next();
    } catch {
      next(new ApiError(503, 'auth_service_unavailable', 'Authentication service is temporarily unavailable.'));
    }
  };
}