import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { fileTypeFromBuffer } from 'file-type';
import { ZodError } from 'zod';
import type { PrismaClient } from '../generated/prisma/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiConfig } from './config.js';
import { createAuthMiddleware, type AuthenticatedRequest } from './auth.js';
import {
  attendancePayloadSchema,
  createAttendance,
  getAttendancePhotoEvidence,
  getActiveWorkLocation,
  getAttendanceHistory,
  serializeAttendance,
} from './attendance.js';
import { ApiError } from './errors.js';
import type { AttendancePhotoStorage } from './photoStorage.js';

export interface AppDependencies {
  prisma: PrismaClient;
  supabase: SupabaseClient;
  config: ApiConfig;
  photoStorage: AttendancePhotoStorage;
}

export function createApp({ prisma, supabase, config, photoStorage }: AppDependencies) {
  const app = express();
  const authenticate = createAuthMiddleware(supabase);
  const photoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, parts: 7 },
  }).single('photo');

  app.disable('x-powered-by');
  if (config.trustProxyHops > 0) app.set('trust proxy', config.trustProxyHops);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '20kb', strict: true }));
  app.use('/api', rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({ error: 'rate_limited', message: 'Too many requests. Try again later.' });
    },
  }));

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok', service: 'geopulse-attendance-api' });
  });

  app.get('/api/work-locations/active', authenticate, async (request, response, next) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.authUser || !authRequest.authClaims) {
        throw new ApiError(401, 'unauthorized', 'Authentication is required.');
      }
      const location = await getActiveWorkLocation(
        prisma,
        authRequest.authUser.id,
        authRequest.authClaims,
        config.maxGpsAccuracyMeters
      );
      response.status(200).json(location);
    } catch (error) {
      next(error);
    }
  });

  const postAttendance = (type: 'check_in' | 'check_out') => async (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.authUser || !authRequest.authClaims || !authRequest.accessToken) {
        throw new ApiError(401, 'unauthorized', 'Authentication is required.');
      }

      const file = request.file;
      if (!file) {
        throw new ApiError(400, 'photo_required', 'A confirmed selfie photo is required.');
      }
      const imageType = await fileTypeFromBuffer(file.buffer);
      if (!imageType || imageType.mime !== 'image/jpeg') {
        throw new ApiError(415, 'invalid_photo_format', 'Attendance photos must be valid JPEG images.');
      }

      const fields = request.body as Record<string, unknown>;
      const allowedFields = new Set(['latitude', 'longitude', 'accuracy', 'timestamp', 'workLocationId']);
      if (Object.keys(fields).some((field) => !allowedFields.has(field))) {
        throw new ApiError(400, 'invalid_request', 'Request contains unsupported attendance fields.');
      }
      const payload = attendancePayloadSchema.parse({
        latitude: typeof fields.latitude === 'string' ? Number(fields.latitude) : Number.NaN,
        longitude: typeof fields.longitude === 'string' ? Number(fields.longitude) : Number.NaN,
        accuracy: typeof fields.accuracy === 'string' ? Number(fields.accuracy) : Number.NaN,
        timestamp: fields.timestamp,
        workLocationId: fields.workLocationId,
      });

      const attendanceId = randomUUID();
      const photoPath = `${authRequest.authUser.id}/${attendanceId}/${type}.jpg`;
      const capturedAt = new Date();
      const row = await createAttendance(
        prisma,
        config,
        authRequest.authUser.id,
        authRequest.authClaims,
        type,
        payload,
        {
          attendanceId,
          path: photoPath,
          capturedAt,
          upload: () => photoStorage.upload(authRequest.accessToken!, photoPath, file.buffer),
        }
      );
      const result = serializeAttendance(row);
      if (
        result.verification_status !== 'verified' ||
        result.is_within_geofence !== true ||
        result.office_id !== payload.workLocationId ||
        !result.photo_captured_at
      ) {
        throw new ApiError(500, 'attendance_verification_failed', 'Server could not verify the attendance record.');
      }
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  app.post('/api/attendance/check-in', authenticate, photoUpload, postAttendance('check_in'));
  app.post('/api/attendance/check-out', authenticate, photoUpload, postAttendance('check_out'));

  app.get('/api/attendance/history', authenticate, async (request, response, next) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.authUser || !authRequest.authClaims) {
        throw new ApiError(401, 'unauthorized', 'Authentication is required.');
      }
      const requestedLimit = request.query.limit === undefined ? 30 : Number(request.query.limit);
      if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
        throw new ApiError(400, 'invalid_limit', 'History limit must be an integer between 1 and 100.');
      }
      const records = await getAttendanceHistory(
        prisma,
        authRequest.authUser.id,
        authRequest.authClaims,
        requestedLimit
      );
      response.status(200).json(records);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/attendance-photos', authenticate, async (request, response, next) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.authUser || !authRequest.authClaims || !authRequest.accessToken) {
        throw new ApiError(401, 'unauthorized', 'Authentication is required.');
      }
      const requestedLimit = request.query.limit === undefined ? 50 : Number(request.query.limit);
      if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
        throw new ApiError(400, 'invalid_limit', 'Photo evidence limit must be an integer between 1 and 100.');
      }

      const records = await getAttendancePhotoEvidence(
        prisma,
        authRequest.authUser.id,
        authRequest.authClaims,
        requestedLimit
      );
      const evidence = await Promise.all(records.map(async (row) => {
        if (!row.photo_path || !row.photo_captured_at) {
          throw new ApiError(500, 'invalid_photo_record', 'Attendance photo metadata is incomplete.');
        }
        return {
          ...serializeAttendance(row),
          photo_url: await photoStorage.createSignedUrl(authRequest.accessToken!, row.photo_path),
        };
      }));
      response.status(200).json(evidence);
    } catch (error) {
      next(error);
    }
  });

  app.use((_request, _response, next) => {
    next(new ApiError(404, 'not_found', 'Endpoint not found.'));
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    if (error instanceof ApiError) {
      response.status(error.status).json({ error: error.code, message: error.message });
      return;
    }

    if (error instanceof ZodError) {
      response.status(400).json({
        error: 'invalid_request',
        message: 'Request body is invalid.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      response.status(tooLarge ? 413 : 400).json({
        error: tooLarge ? 'photo_too_large' : 'invalid_photo_upload',
        message: tooLarge
          ? 'Attendance photo exceeds the 5 MB limit.'
          : 'Attendance photo upload is invalid.',
      });
      return;
    }

    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: 'invalid_json', message: 'Request body must be valid JSON.' });
      return;
    }

    if (
      error && typeof error === 'object' && 'type' in error &&
      error.type === 'entity.too.large'
    ) {
      response.status(413).json({ error: 'payload_too_large', message: 'Request body exceeds the allowed size.' });
      return;
    }

    if (config.nodeEnv !== 'test') console.error('Unhandled API error');
    response.status(500).json({ error: 'internal_error', message: 'An internal server error occurred.' });
  };
  app.use(errorHandler);

  return app;
}