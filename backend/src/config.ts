import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  FRONTEND_ORIGIN: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  ATTENDANCE_PHOTO_BUCKET: z.literal('attendance-photos').default('attendance-photos'),
  MAX_GPS_ACCURACY_METERS: z.coerce.number().finite().positive().default(20),
  ATTENDANCE_TIME_ZONE: z.string().min(1).default('Asia/Jakarta'),
});

export interface ApiConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  trustProxyHops: number;
  frontendOrigins: string[];
  maxGpsAccuracyMeters: number;
  attendanceTimeZone: string;
  attendancePhotoBucket: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Backend environment is invalid. Check: ${fields}`);
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: parsed.data.ATTENDANCE_TIME_ZONE });
  } catch {
    throw new Error('ATTENDANCE_TIME_ZONE must be a valid IANA time zone.');
  }

  const frontendOrigins = parsed.data.FRONTEND_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (frontendOrigins.length === 0) {
    throw new Error('FRONTEND_ORIGIN must contain at least one origin.');
  }
  for (const origin of frontendOrigins) {
    try {
      const parsedOrigin = new URL(origin);
      if (
        origin === '*' ||
        !['http:', 'https:'].includes(parsedOrigin.protocol) ||
        parsedOrigin.origin !== origin
      ) {
        throw new Error();
      }
    } catch {
      throw new Error('FRONTEND_ORIGIN must be a comma-separated list of exact HTTP(S) origins without paths or wildcards.');
    }
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    trustProxyHops: parsed.data.TRUST_PROXY_HOPS,
    frontendOrigins,
    maxGpsAccuracyMeters: parsed.data.MAX_GPS_ACCURACY_METERS,
    attendanceTimeZone: parsed.data.ATTENDANCE_TIME_ZONE,
    attendancePhotoBucket: parsed.data.ATTENDANCE_PHOTO_BUCKET,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
  };
}