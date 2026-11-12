import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import test from 'node:test';
import type { PrismaClient } from '../../generated/prisma/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createApp } from '../app.js';
import { loadConfig, type ApiConfig } from '../config.js';

const employeeId = '00000000-0000-4000-8000-000000000001';
const otherEmployeeId = '00000000-0000-4000-8000-000000000002';
const officeId = '00000000-0000-4000-8000-000000000010';
const validJpeg = Buffer.from('ffd8ffe000104a46494600010100000100010000', 'hex');

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function makeJwt(subject: string, tokenId: string, expiresAt = Math.floor(Date.now() / 1000) + 3600): string {
  const claims = Buffer.from(JSON.stringify({
    sub: subject,
    role: 'authenticated',
    aud: 'authenticated',
    exp: expiresAt,
    jti: tokenId,
    app_metadata: { provider: 'email' },
    user_metadata: {},
  })).toString('base64url');
  return `header.${claims}.signature`;
}

const testTokens = {
  valid: makeJwt(employeeId, 'valid'),
  other: makeJwt(otherEmployeeId, 'other'),
  expired: makeJwt(employeeId, 'expired', Math.floor(Date.now() / 1000) - 3600),
  authUnavailable: makeJwt(employeeId, 'auth-unavailable'),
  subjectMismatch: makeJwt(otherEmployeeId, 'subject-mismatch'),
};
const testTokenAliases: Record<string, string> = {
  'valid-token': testTokens.valid,
  'other-token': testTokens.other,
  'expired-token': testTokens.expired,
  'auth-unavailable-token': testTokens.authUnavailable,
  'subject-mismatch-token': testTokens.subjectMismatch,
};

interface StoredAttendance {
  id: string;
  employee_id: string;
  type: 'check_in' | 'check_out';
  attendance_date: Date;
  checked_at: Date;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_m: number | null;
  distance_to_office_m: number | null;
  is_within_geofence: boolean | null;
  office_id: string | null;
  verification_status: 'verified' | 'rejected' | 'pending';
  address_label: string | null;
  note: string | null;
  photo_path: string | null;
  photo_captured_at: Date | null;
  created_at: Date;
}

function sameDate(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

class MemoryPrisma {
  employees = new Map<string, { id: string; is_active: boolean; role: string }>();
  offices = new Map<string, {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius_m: number;
    is_active: boolean;
    created_at: Date;
  }>();
  records: StoredAttendance[] = [];
  photoObjects = new Set<string>();
  failPhotoUpload = false;
  roleSetupCount = 0;
  jwtClaimSetupCount = 0;
  failAttendanceReads = false;
  private transactionTail: Promise<void> = Promise.resolve();
  readonly client: object;

  constructor() {
    this.client = {
      employees: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          this.employees.get(where.id) ?? null,
      },
      offices: {
        findMany: async ({ where }: { where: { is_active: boolean } }) =>
          [...this.offices.values()].filter((office) => office.is_active === where.is_active),
        findUnique: async ({ where }: { where: { id: string } }) =>
          this.offices.get(where.id) ?? null,
      },
      attendance: {
        findMany: async ({ where, orderBy, take }: {
          where: {
            employee_id?: string;
            attendance_date?: Date | { lt: Date };
            type?: string;
            photo_path?: { not: null };
          };
          orderBy?: Array<Record<string, string>>;
          take?: number;
        }) => {
          if (this.failAttendanceReads) throw new Error('private database connection detail');
          let rows = this.records.filter((row) => {
            if (where.employee_id && row.employee_id !== where.employee_id) return false;
            if (where.type && row.type !== where.type) return false;
            if (where.photo_path && row.photo_path === null) return false;
            if (where.attendance_date instanceof Date && !sameDate(row.attendance_date, where.attendance_date)) return false;
            if (
              where.attendance_date && !(where.attendance_date instanceof Date) &&
              row.attendance_date >= where.attendance_date.lt
            ) return false;
            return true;
          });
          if (orderBy?.[0]?.attendance_date === 'desc') {
            rows = [...rows].sort((left, right) => right.attendance_date.getTime() - left.attendance_date.getTime());
          }
          if (orderBy?.[0]?.checked_at === 'desc') {
            rows = [...rows].sort((left, right) => right.checked_at.getTime() - left.checked_at.getTime());
          }
          if (take !== undefined) rows = rows.slice(0, take);
          return rows;
        },
        findFirst: async ({ where, orderBy }: {
          where: {
            employee_id: string;
            attendance_date?: Date | { lt: Date };
            type?: string;
          };
          orderBy?: { attendance_date?: string };
        }) => {
          let rows = this.records.filter((row) => {
            if (row.employee_id !== where.employee_id) return false;
            if (where.type && row.type !== where.type) return false;
            if (where.attendance_date instanceof Date && !sameDate(row.attendance_date, where.attendance_date)) return false;
            if (
              where.attendance_date && !(where.attendance_date instanceof Date) &&
              row.attendance_date >= where.attendance_date.lt
            ) return false;
            return true;
          });
          if (orderBy?.attendance_date === 'desc') {
            rows = [...rows].sort((left, right) => right.attendance_date.getTime() - left.attendance_date.getTime());
          }
          return rows[0] ?? null;
        },
        create: async ({ data }: { data: Omit<StoredAttendance, 'created_at' | 'address_label' | 'note'> }) => {
          const row: StoredAttendance = {
            ...data,
            address_label: null,
            note: null,
            created_at: new Date(),
          };
          this.records.push(row);
          return row;
        },
      },
      $executeRawUnsafe: async (query: string) => {
        if (query === 'SET LOCAL ROLE authenticated') this.roleSetupCount += 1;
        return 0;
      },
      $queryRaw: async (query: { sql?: string }) => {
        if (query.sql?.includes("set_config('request.jwt.claims'")) this.jwtClaimSetupCount += 1;
        return [null];
      },
      $transaction: async (callback: (transaction: object) => Promise<unknown>) =>
        this.withTransaction(callback),
    };
  }

  private async withTransaction<T>(callback: (transaction: object) => Promise<T>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const recordsBeforeTransaction = structuredClone(this.records);
    try {
      return await callback(this.client);
    } catch (error) {
      this.records = recordsBeforeTransaction;
      throw error;
    } finally {
      release();
    }
  }
}

const config: ApiConfig = {
  nodeEnv: 'test',
  port: 0,
  trustProxyHops: 0,
  frontendOrigins: ['http://localhost:5173'],
  maxGpsAccuracyMeters: 20,
  attendanceTimeZone: 'Asia/Jakarta',
  attendancePhotoBucket: 'attendance-photos',
  supabaseUrl: 'https://project.supabase.co',
  supabaseAnonKey: 'test-public-key',
};

const validPayload = {
  latitude: 0,
  longitude: 0,
  accuracy: 10,
  timestamp: '2020-01-01T00:00:00.000Z',
  workLocationId: officeId,
};

async function withApi(
  run: (baseUrl: string, database: MemoryPrisma) => Promise<void>,
  options: {
    activeEmployee?: boolean;
    activeOffice?: boolean;
    nodeEnv?: ApiConfig['nodeEnv'];
    employeeRole?: string;
  } = {}
) {
  const database = new MemoryPrisma();
  if (options.activeEmployee !== false) {
    database.employees.set(employeeId, {
      id: employeeId,
      is_active: true,
      role: options.employeeRole ?? 'employee',
    });
  }
  if (options.activeOffice !== false) {
    database.offices.set(officeId, {
      id: officeId,
      name: 'Test Office',
      latitude: 0,
      longitude: 0,
      radius_m: 100,
      is_active: true,
      created_at: new Date('2025-01-01T00:00:00.000Z'),
    });
  }

  const supabase = {
    auth: {
      getUser: async (token: string) => {
        if (token === testTokens.valid) return { data: { user: { id: employeeId } }, error: null };
        if (token === testTokens.other) return { data: { user: { id: otherEmployeeId } }, error: null };
        if (token === testTokens.subjectMismatch) return { data: { user: { id: employeeId } }, error: null };
        if (token === testTokens.authUnavailable) {
          return { data: { user: null }, error: Object.assign(new Error('private auth detail'), { status: 503 }) };
        }
        return {
          data: { user: null },
          error: Object.assign(new Error(token === testTokens.expired ? 'expired token' : 'invalid token'), { status: 401 }),
        };
      },
    },
  } as unknown as SupabaseClient;

  const app = createApp({
    prisma: database.client as PrismaClient,
    supabase,
    config: { ...config, nodeEnv: options.nodeEnv ?? config.nodeEnv },
    photoStorage: {
      upload: async (_accessToken, path) => {
        if (database.failPhotoUpload) throw new Error('private storage detail');
        database.photoObjects.add(path);
      },
      createSignedUrl: async (_accessToken, path) => {
        if (!database.photoObjects.has(path)) throw new Error('Photo object not found.');
        return `https://private.example/${encodeURIComponent(path)}?signed=temporary`;
      },
    },
  });
  const server = app.listen(0);
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl, database);
  } finally {
    await new Promise<void>((resolve, reject) => {
      (server as Server).close((error) => error ? reject(error) : resolve());
    });
  }
}

async function callApi(
  baseUrl: string,
  path: string,
  options: { token?: string; method?: string; body?: unknown; photo?: boolean; photoBytes?: Buffer } = {}
) {
  const headers = new Headers();
  if (options.token) {
    headers.set('Authorization', `Bearer ${testTokenAliases[options.token] ?? options.token}`);
  }
  let body: BodyInit | undefined;
  if (options.body !== undefined && path.startsWith('/api/attendance/check-')) {
    const formData = new FormData();
    if (options.body && typeof options.body === 'object') {
      for (const [key, value] of Object.entries(options.body)) {
        formData.append(key, String(value));
      }
    }
    if (options.photo !== false) {
      formData.append(
        'photo',
        new Blob([copyToArrayBuffer(options.photoBytes ?? validJpeg)], { type: 'image/jpeg' }),
        'selfie.jpg'
      );
    }
    body = formData;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });
}

test('health is public and does not expose configuration', async () => {
  await withApi(async (baseUrl) => {
    const response = await callApi(baseUrl, '/api/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'geopulse-attendance-api' });
  });
});

test('missing and invalid bearer tokens are rejected', async () => {
  await withApi(async (baseUrl) => {
    const protectedRoutes = [
      { path: '/api/work-locations/active' },
      { path: '/api/attendance/history' },
      { path: '/api/admin/attendance-photos' },
      { path: '/api/attendance/check-in', method: 'POST' },
      { path: '/api/attendance/check-out', method: 'POST' },
    ];
    for (const route of protectedRoutes) {
      assert.equal((await callApi(baseUrl, route.path, { method: route.method })).status, 401);
      assert.equal((await callApi(baseUrl, route.path, { method: route.method, token: 'malformed token' })).status, 401);
      assert.equal((await callApi(baseUrl, route.path, { method: route.method, token: 'bad-token' })).status, 401);
      assert.equal((await callApi(baseUrl, route.path, { method: route.method, token: 'expired-token' })).status, 401);
      assert.equal((await callApi(baseUrl, route.path, { method: route.method, token: 'subject-mismatch-token' })).status, 401);
    }
  });
});

test('Supabase Auth outages return 503 without exposing upstream errors', async () => {
  await withApi(async (baseUrl) => {
    const response = await callApi(baseUrl, '/api/work-locations/active', {
      token: 'auth-unavailable-token',
    });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error, 'auth_service_unavailable');
    assert.equal(JSON.stringify(body).includes('private auth detail'), false);
  });
});

test('missing or inactive employee is rejected', async () => {
  await withApi(async (baseUrl) => {
    const response = await callApi(baseUrl, '/api/work-locations/active', { token: 'valid-token' });
    assert.equal(response.status, 403);
  }, { activeEmployee: false });

  await withApi(async (baseUrl, database) => {
    const response = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
    });
    assert.equal(response.status, 403);
    assert.equal(database.records.length, 0);
  }, { activeEmployee: false });

  await withApi(async (baseUrl, database) => {
    database.employees.set(employeeId, { id: employeeId, is_active: false, role: 'employee' });
    const response = await callApi(baseUrl, '/api/work-locations/active', { token: 'valid-token' });
    assert.equal(response.status, 403);
  });

  await withApi(async (baseUrl, database) => {
    database.employees.set(employeeId, { id: employeeId, is_active: false, role: 'employee' });
    const response = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
    });
    assert.equal(response.status, 403);
    assert.equal(database.records.length, 0);
  });
});

test('active work location returns the configured frontend contract', async () => {
  await withApi(async (baseUrl) => {
    const response = await callApi(baseUrl, '/api/work-locations/active', { token: 'valid-token' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: officeId,
      name: 'Test Office',
      latitude: 0,
      longitude: 0,
      radiusMeters: 100,
      maxAccuracyMeters: 20,
      isActive: true,
    });
  });
});

test('no active office returns 404', async () => {
  await withApi(async (baseUrl) => {
    const response = await callApi(baseUrl, '/api/work-locations/active', { token: 'valid-token' });
    assert.equal(response.status, 404);
  }, { activeOffice: false });

  await withApi(async (baseUrl) => {
    const response = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: { ...validPayload, workLocationId: '00000000-0000-4000-8000-000000000099' },
    });
    assert.equal(response.status, 404);
  });
});

test('invalid coordinates and accuracy are rejected', async () => {
  await withApi(async (baseUrl) => {
    const latitude = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: { ...validPayload, latitude: 91 },
    });
    assert.equal(latitude.status, 400);

    const accuracy = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: { ...validPayload, accuracy: 0 },
    });
    assert.equal(accuracy.status, 400);
  });
});

test('excessive GPS accuracy and outside-geofence positions are rejected', async () => {
  await withApi(async (baseUrl) => {
    const accuracy = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: { ...validPayload, accuracy: 20.1 },
    });
    assert.equal(accuracy.status, 422);

    const outside = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: { ...validPayload, latitude: 0.01 },
    });
    assert.equal(outside.status, 422);
    assert.equal((await outside.json()).error, 'outside_geofence');
  });
});

test('check-in and check-out succeed with server time and verified response', async () => {
  await withApi(async (baseUrl) => {
    const checkIn = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    assert.equal(checkIn.status, 201);
    const checkInRow = await checkIn.json();
    assert.equal(checkInRow.employee_id, employeeId);
    assert.equal(checkInRow.type, 'check_in');
    assert.equal(checkInRow.is_within_geofence, true);
    assert.equal(checkInRow.verification_status, 'verified');
    assert.equal(checkInRow.office_id, officeId);
    assert.equal(typeof checkInRow.photo_captured_at, 'string');
    assert.notEqual(checkInRow.checked_at, validPayload.timestamp);
    const checkedAt = new Date(checkInRow.checked_at);
    const expectedAttendanceDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: config.attendanceTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(checkedAt);
    assert.equal(checkInRow.attendance_date, expectedAttendanceDate);

    const checkOut = await callApi(baseUrl, '/api/attendance/check-out', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    assert.equal(checkOut.status, 201);
    const checkOutRow = await checkOut.json();
    assert.equal(checkOutRow.type, 'check_out');
    assert.equal(checkOutRow.verification_status, 'verified');
    assert.equal(typeof checkOutRow.photo_captured_at, 'string');
  });
});

test('attendance requires a valid selfie and rolls back if photo storage fails', async () => {
  await withApi(async (baseUrl, database) => {
    const missingPhoto = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
      photo: false,
    });
    assert.equal(missingPhoto.status, 400);
    assert.equal((await missingPhoto.json()).error, 'photo_required');
    assert.equal(database.records.length, 0);

    const invalidPhoto = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
      photoBytes: Buffer.from('not an image'),
    });
    assert.equal(invalidPhoto.status, 415);
    assert.equal((await invalidPhoto.json()).error, 'invalid_photo_format');
    assert.equal(database.records.length, 0);

    const tooLarge = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
      photoBytes: Buffer.alloc(5 * 1024 * 1024 + 1, 0xff),
    });
    assert.equal(tooLarge.status, 413);
    assert.equal((await tooLarge.json()).error, 'photo_too_large');
    assert.equal(database.records.length, 0);

    database.failPhotoUpload = true;
    const failedUpload = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
    });
    assert.equal(failedUpload.status, 502);
    assert.equal((await failedUpload.json()).error, 'photo_upload_failed');
    assert.equal(database.records.length, 0);
  });
});

test('GPS and geofence validation occur before a photo is stored', async () => {
  await withApi(async (baseUrl, database) => {
    const outside = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: { ...validPayload, latitude: 0.01 },
    });
    assert.equal(outside.status, 422);
    assert.equal((await outside.json()).error, 'outside_geofence');
    assert.equal(database.photoObjects.size, 0);
    assert.equal(database.records.length, 0);
  });
});

test('admin photo evidence is signed and unavailable to employee accounts', async () => {
  await withApi(async (baseUrl) => {
    const checkIn = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
    });
    assert.equal(checkIn.status, 201);

    const denied = await callApi(baseUrl, '/api/admin/attendance-photos', { token: 'valid-token' });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error, 'admin_required');
  });

  await withApi(async (baseUrl) => {
    const checkIn = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
    });
    assert.equal(checkIn.status, 201);

    const evidence = await callApi(baseUrl, '/api/admin/attendance-photos', {
      token: 'valid-token',
    });
    assert.equal(evidence.status, 200);
    const rows = await evidence.json();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].employee_id, employeeId);
    assert.equal(rows[0].type, 'check_in');
    assert.equal(rows[0].latitude, validPayload.latitude);
    assert.equal(rows[0].longitude, validPayload.longitude);
    assert.match(rows[0].photo_url, /^https:\/\/private\.example\//);
  }, { employeeRole: 'admin' });
});

test('duplicate check-in and invalid check-out sequence are rejected', async () => {
  await withApi(async (baseUrl) => {
    const first = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    assert.equal(first.status, 201);

    const duplicate = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).error, 'duplicate_check_in');
  });

  await withApi(async (baseUrl) => {
    const checkOut = await callApi(baseUrl, '/api/attendance/check-out', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    assert.equal(checkOut.status, 409);
    assert.equal((await checkOut.json()).error, 'invalid_attendance_sequence');
  });

  await withApi(async (baseUrl) => {
    await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    const firstCheckOut = await callApi(baseUrl, '/api/attendance/check-out', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    assert.equal(firstCheckOut.status, 201);
    const duplicateCheckOut = await callApi(baseUrl, '/api/attendance/check-out', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    assert.equal(duplicateCheckOut.status, 409);
    assert.equal((await duplicateCheckOut.json()).error, 'duplicate_check_out');
  });
});

test('concurrent duplicate requests produce exactly one attendance row', async () => {
  await withApi(async (baseUrl, database) => {
    const send = () => callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token', method: 'POST', body: validPayload,
    });
    const responses = await Promise.all([send(), send()]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    assert.equal(database.records.length, 1);
  });
});

test('attendance history only returns the authenticated employee records', async () => {
  await withApi(async (baseUrl, database) => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    const baseRow = {
      id: randomUUID(),
      type: 'check_in' as const,
      attendance_date: date,
      checked_at: date,
      latitude: 0,
      longitude: 0,
      gps_accuracy_m: 10,
      distance_to_office_m: 5,
      is_within_geofence: true,
      office_id: officeId,
      verification_status: 'verified' as const,
      address_label: null,
      note: null,
      photo_path: null,
      photo_captured_at: null,
      created_at: date,
    };
    database.records.push(
      { ...baseRow, employee_id: employeeId },
      { ...baseRow, id: randomUUID(), employee_id: otherEmployeeId }
    );

    const response = await callApi(baseUrl, '/api/attendance/history', { token: 'valid-token' });
    assert.equal(response.status, 200);
    const records = await response.json();
    assert.equal(records.length, 1);
    assert.equal(records[0].employee_id, employeeId);

    database.employees.set(otherEmployeeId, { id: otherEmployeeId, is_active: true, role: 'employee' });
    const otherResponse = await callApi(baseUrl, '/api/attendance/history', { token: 'other-token' });
    assert.equal(otherResponse.status, 200);
    const otherRecords = await otherResponse.json();
    assert.equal(otherRecords.length, 1);
    assert.equal(otherRecords[0].employee_id, otherEmployeeId);
  });
});

test('multiple active offices fail closed instead of selecting an arbitrary location', async () => {
  await withApi(async (baseUrl, database) => {
    database.offices.set('00000000-0000-4000-8000-000000000011', {
      id: '00000000-0000-4000-8000-000000000011',
      name: 'Second Office',
      latitude: 0,
      longitude: 0,
      radius_m: 100,
      is_active: true,
      created_at: new Date(),
    });
    const response = await callApi(baseUrl, '/api/work-locations/active', { token: 'valid-token' });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, 'ambiguous_active_office');
  });
});

test('attendance rejects a known but inactive office', async () => {
  await withApi(async (baseUrl, database) => {
    const office = database.offices.get(officeId);
    assert.ok(office);
    office.is_active = false;

    const response = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: validPayload,
    });
    assert.equal(response.status, 404);
    assert.equal(database.records.length, 0);
  });
});

test('malformed JSON and invalid payloads return predictable client errors', async () => {
  await withApi(async (baseUrl) => {
    const malformedJson = await fetch(`${baseUrl}/api/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: '{broken',
    });
    assert.equal(malformedJson.status, 400);
    assert.equal((await malformedJson.json()).error, 'invalid_json');

    const invalidPayload = await callApi(baseUrl, '/api/attendance/check-in', {
      token: 'valid-token',
      method: 'POST',
      body: { ...validPayload, untrustedEmployeeId: otherEmployeeId },
    });
    assert.equal(invalidPayload.status, 400);
    assert.equal((await invalidPayload.json()).error, 'invalid_request');
  });
});

test('database failures have sanitized production responses', async () => {
  await withApi(async (baseUrl, database) => {
    database.failAttendanceReads = true;
    const response = await callApi(baseUrl, '/api/attendance/history', { token: 'valid-token' });
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.deepEqual(body, {
      error: 'internal_error',
      message: 'An internal server error occurred.',
    });
    assert.equal(JSON.stringify(body).includes('private database connection detail'), false);
  }, { nodeEnv: 'production' });
});

test('CORS omits allow-origin for unconfigured origins', async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

test('protected database access sets Supabase RLS role and identity claims', async () => {
  await withApi(async (baseUrl, database) => {
    const response = await callApi(baseUrl, '/api/work-locations/active', { token: 'valid-token' });
    assert.equal(response.status, 200);
    assert.equal(database.roleSetupCount, 1);
    assert.equal(database.jwtClaimSetupCount, 1);
  });
});

test('backend config accepts exact origins and rejects wildcard or path origins', () => {
  const baseEnvironment = {
    DATABASE_URL: 'postgresql://api:secret@localhost:5432/app',
    DIRECT_URL: 'postgresql://api:secret@localhost:5432/app',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-public-key',
  };
  assert.deepEqual(
    loadConfig({ ...baseEnvironment, FRONTEND_ORIGIN: 'http://localhost:5173,https://app.example' }).frontendOrigins,
    ['http://localhost:5173', 'https://app.example']
  );
  assert.throws(
    () => loadConfig({ ...baseEnvironment, FRONTEND_ORIGIN: '*' }),
    /exact HTTP\(S\) origins/
  );
  assert.throws(
    () => loadConfig({ ...baseEnvironment, FRONTEND_ORIGIN: 'https://app.example/path' }),
    /exact HTTP\(S\) origins/
  );
});