import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../generated/prisma/index.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createAttendancePhotoStorage } from './photoStorage.js';

const config = loadConfig();
const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const app = createApp({
  prisma,
  supabase,
  config,
  photoStorage: createAttendancePhotoStorage(config),
});
const server = app.listen(config.port, () => {
  console.info(`GeoPulse API listening on port ${config.port}`);
});

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down GeoPulse API.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));