import {
  attendance_type,
  Prisma,
  verification_status,
} from '../generated/prisma/index.js';
import type { PrismaClient } from '../generated/prisma/index.js';
import { z } from 'zod';
import { ApiError } from './errors.js';
import type { ApiConfig } from './config.js';

export const attendancePayloadSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().positive(),
  timestamp: z.string().datetime({ offset: true }),
  workLocationId: z.string().uuid(),
}).strict();

export type AttendancePayload = z.infer<typeof attendancePayloadSchema>;
export type AttendanceRow = Prisma.attendanceGetPayload<Record<string, never>>;
type AttendanceTransaction = Prisma.TransactionClient;

export interface AttendancePhotoWrite {
  attendanceId: string;
  path: string;
  capturedAt: Date;
  upload: () => Promise<void>;
}

async function withAuthenticatedTransaction<T>(
  prisma: PrismaClient,
  userId: string,
  authClaims: Record<string, unknown>,
  operation: (transaction: AttendanceTransaction) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (transaction) => {
    if (authClaims.sub !== userId || authClaims.role !== 'authenticated') {
      throw new ApiError(401, 'invalid_token', 'Verified token claims do not match the authenticated user.');
    }
    const claims = JSON.stringify(authClaims);
    await transaction.$executeRawUnsafe('SET LOCAL ROLE authenticated');
    await transaction.$queryRaw(Prisma.sql`
      SELECT set_config('request.jwt.claims', ${claims}, true)
    `);
    await transaction.$queryRaw(Prisma.sql`
      SELECT set_config('request.jwt.claim.sub', ${userId}, true)
    `);
    return operation(transaction);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

async function requireActiveEmployee(transaction: AttendanceTransaction, userId: string) {
  const employee = await transaction.employees.findUnique({ where: { id: userId } });
  if (!employee || !employee.is_active) {
    throw new ApiError(403, 'employee_not_authorized', 'No active employee account is linked to this user.');
  }
  return employee;
}

export function calculateDistanceMeters(
  latitude: number,
  longitude: number,
  officeLatitude: number,
  officeLongitude: number
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(officeLatitude - latitude);
  const longitudeDelta = toRadians(officeLongitude - longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
      Math.cos(toRadians(officeLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371000 * 2 * Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine));
}

function dateForTimeZone(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const dateString = `${values.year}-${values.month}-${values.day}`;
  return new Date(`${dateString}T00:00:00.000Z`);
}

export function serializeAttendance(row: AttendanceRow) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    type: row.type,
    attendance_date: row.attendance_date.toISOString().slice(0, 10),
    checked_at: row.checked_at.toISOString(),
    latitude: row.latitude,
    longitude: row.longitude,
    gps_accuracy_m: row.gps_accuracy_m,
    distance_to_office_m: row.distance_to_office_m,
    is_within_geofence: row.is_within_geofence,
    office_id: row.office_id,
    verification_status: row.verification_status,
    address_label: row.address_label,
    note: row.note,
    photo_captured_at: row.photo_captured_at?.toISOString() ?? null,
  };
}

function ensureOfficeCoordinates(office: {
  latitude: number;
  longitude: number;
  radius_m: number;
}) {
  if (
    !Number.isFinite(office.latitude) || office.latitude < -90 || office.latitude > 90 ||
    !Number.isFinite(office.longitude) || office.longitude < -180 || office.longitude > 180 ||
    !Number.isFinite(office.radius_m) || office.radius_m <= 0
  ) {
    throw new ApiError(500, 'invalid_office_configuration', 'The office geofence configuration is invalid.');
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function getActiveWorkLocation(
  prisma: PrismaClient,
  userId: string,
  authClaims: Record<string, unknown>,
  maxGpsAccuracyMeters: number
) {
  return withAuthenticatedTransaction(prisma, userId, authClaims, async (transaction) => {
    await requireActiveEmployee(transaction, userId);
    const offices = await transaction.offices.findMany({ where: { is_active: true } });
    if (offices.length === 0) {
      throw new ApiError(404, 'active_office_not_found', 'No active work location is configured.');
    }
    if (offices.length > 1) {
      throw new ApiError(409, 'ambiguous_active_office', 'More than one active work location is configured.');
    }
    const office = offices[0];
    if (!office) {
      throw new ApiError(404, 'active_office_not_found', 'No active work location is configured.');
    }
    ensureOfficeCoordinates(office);

    return {
      id: office.id,
      name: office.name,
      latitude: office.latitude,
      longitude: office.longitude,
      radiusMeters: office.radius_m,
      maxAccuracyMeters: maxGpsAccuracyMeters,
      isActive: office.is_active,
    };
  });
}

export async function createAttendance(
  prisma: PrismaClient,
  config: ApiConfig,
  userId: string,
  authClaims: Record<string, unknown>,
  type: 'check_in' | 'check_out',
  payload: AttendancePayload,
  photo: AttendancePhotoWrite,
  now = new Date()
): Promise<AttendanceRow> {
  if (payload.accuracy > config.maxGpsAccuracyMeters) {
    throw new ApiError(
      422,
      'gps_accuracy_too_low',
      `GPS accuracy must be ${config.maxGpsAccuracyMeters} meters or better.`
    );
  }

  const attendanceDate = dateForTimeZone(now, config.attendanceTimeZone);

  try {
    return await withAuthenticatedTransaction(prisma, userId, authClaims, async (transaction) => {
      // A transaction-scoped lock serializes attendance sequence changes without row updates.
      await transaction.$queryRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))
      `);

      await requireActiveEmployee(transaction, userId);

      const activeOffices = await transaction.offices.findMany({ where: { is_active: true } });
      if (activeOffices.length === 0) {
        throw new ApiError(404, 'active_office_not_found', 'No active work location is configured.');
      }
      if (activeOffices.length > 1) {
        throw new ApiError(409, 'ambiguous_active_office', 'More than one active work location is configured.');
      }
      const office = activeOffices[0];
      if (!office || office.id !== payload.workLocationId) {
        throw new ApiError(404, 'active_office_not_found', 'The requested work location is not active.');
      }
      ensureOfficeCoordinates(office);

      const distanceMeters = calculateDistanceMeters(
        payload.latitude,
        payload.longitude,
        office.latitude,
        office.longitude
      );
      if (distanceMeters > office.radius_m) {
        throw new ApiError(422, 'outside_geofence', 'Outside Authorized Area.');
      }

      const todayRows = await transaction.attendance.findMany({
        where: { employee_id: userId, attendance_date: attendanceDate },
      });
      const todayCheckIn = todayRows.find((row) => row.type === attendance_type.check_in);
      const todayCheckOut = todayRows.find((row) => row.type === attendance_type.check_out);

      if (type === attendance_type.check_in) {
        if (todayCheckIn) {
          throw new ApiError(409, 'duplicate_check_in', 'A check-in is already recorded for this attendance date.');
        }
        if (todayCheckOut) {
          throw new ApiError(409, 'invalid_attendance_sequence', 'A check-in cannot follow a check-out on the same date.');
        }

        const latestPreviousCheckIn = await transaction.attendance.findFirst({
          where: {
            employee_id: userId,
            type: attendance_type.check_in,
            attendance_date: { lt: attendanceDate },
          },
          orderBy: { attendance_date: 'desc' },
        });
        if (latestPreviousCheckIn) {
          const previousCheckOut = await transaction.attendance.findFirst({
            where: {
              employee_id: userId,
              type: attendance_type.check_out,
              attendance_date: latestPreviousCheckIn.attendance_date,
            },
          });
          if (!previousCheckOut) {
            throw new ApiError(409, 'open_attendance_exists', 'Check out of the previous attendance before checking in again.');
          }
        }
      } else {
        if (!todayCheckIn) {
          throw new ApiError(409, 'invalid_attendance_sequence', 'A check-in is required before check-out.');
        }
        if (todayCheckOut) {
          throw new ApiError(409, 'duplicate_check_out', 'A check-out is already recorded for this attendance date.');
        }
      }

      try {
        await photo.upload();
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(502, 'photo_upload_failed', 'The attendance photo could not be uploaded.');
      }

      return transaction.attendance.create({
        data: {
          id: photo.attendanceId,
          employee_id: userId,
          type,
          attendance_date: attendanceDate,
          checked_at: now,
          latitude: payload.latitude,
          longitude: payload.longitude,
          gps_accuracy_m: payload.accuracy,
          distance_to_office_m: distanceMeters,
          is_within_geofence: true,
          office_id: office.id,
          verification_status: verification_status.verified,
          photo_path: photo.path,
          photo_captured_at: photo.capturedAt,
        },
      });
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'duplicate_attendance', 'An attendance record already exists for this date and type.');
    }
    throw error;
  }
}

export async function getAttendancePhotoEvidence(
  prisma: PrismaClient,
  userId: string,
  authClaims: Record<string, unknown>,
  limit: number
): Promise<AttendanceRow[]> {
  return withAuthenticatedTransaction(prisma, userId, authClaims, async (transaction) => {
    const employee = await requireActiveEmployee(transaction, userId);
    if (employee.role !== 'admin') {
      throw new ApiError(403, 'admin_required', 'Administrator access is required.');
    }

    return transaction.attendance.findMany({
      where: { photo_path: { not: null } },
      orderBy: [{ checked_at: 'desc' }],
      take: limit,
    });
  });
}

export async function getAttendanceHistory(
  prisma: PrismaClient,
  userId: string,
  authClaims: Record<string, unknown>,
  limit: number
) {
  return withAuthenticatedTransaction(prisma, userId, authClaims, async (transaction) => {
    await requireActiveEmployee(transaction, userId);
    const records = await transaction.attendance.findMany({
      where: { employee_id: userId },
      orderBy: [{ attendance_date: 'desc' }, { checked_at: 'desc' }],
      take: limit,
    });
    return records.map(serializeAttendance);
  });
}