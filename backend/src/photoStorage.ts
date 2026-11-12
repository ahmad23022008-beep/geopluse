import { createClient } from '@supabase/supabase-js';
import type { ApiConfig } from './config.js';
import { ApiError } from './errors.js';

export interface AttendancePhotoStorage {
  upload(accessToken: string, path: string, photo: Buffer): Promise<void>;
  createSignedUrl(accessToken: string, path: string): Promise<string>;
}

export function createAttendancePhotoStorage(config: ApiConfig): AttendancePhotoStorage {
  const createUserClient = (accessToken: string) =>
    createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: 'Bearer'.concat(' ', accessToken) },
      },
    });

  return {
    async upload(accessToken, path, photo) {
      const { error } = await createUserClient(accessToken)
        .storage
        .from(config.attendancePhotoBucket)
        .upload(path, photo, { contentType: 'image/jpeg', upsert: false });
      if (error) {
        throw new ApiError(502, 'photo_upload_failed', 'The attendance photo could not be uploaded.');
      }
    },
    async createSignedUrl(accessToken, path) {
      const { data, error } = await createUserClient(accessToken)
        .storage
        .from(config.attendancePhotoBucket)
        .createSignedUrl(path, 300);
      if (error || !data?.signedUrl) {
        throw new ApiError(502, 'photo_access_failed', 'The attendance photo could not be opened.');
      }
      return data.signedUrl;
    },
  };
}
