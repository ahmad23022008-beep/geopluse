import { supabase } from '../lib/supabase';

export interface WorkLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAccuracyMeters: number | null;
  isActive: boolean;
}

function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function getActiveWorkLocation(): Promise<WorkLocation | null> {
  const apiUrl = import.meta.env.VITE_ATTENDANCE_API_URL?.replace(/\/+$/, '');
  if (!apiUrl) {
    throw new Error('Backend lokasi kerja belum dikonfigurasi.');
  }

  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    throw new Error('Sesi login tidak valid. Silakan masuk kembali.');
  }

  const response = await fetch(`${apiUrl}/api/work-locations/active`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return null;

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'message' in result &&
      typeof result.message === 'string'
        ? result.message
        : `Gagal mengambil lokasi kantor (${response.status}).`;
    throw new Error(message);
  }

  if (!result || typeof result !== 'object') {
    throw new Error('Respons lokasi kantor dari backend tidak valid.');
  }

  const location = result as Record<string, unknown>;
  const latitude = location.latitude;
  const longitude = location.longitude;
  const radiusMeters = location.radiusMeters;
  const maxAccuracyMeters = location.maxAccuracyMeters;

  if (
    typeof location.id !== 'string' ||
    typeof location.name !== 'string' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !isValidCoordinate(latitude, longitude) ||
    typeof radiusMeters !== 'number' ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0 ||
    location.isActive !== true
  ) {
    throw new Error('Konfigurasi lokasi kantor dari backend tidak valid atau tidak aktif.');
  }

  return {
    id: location.id,
    name: location.name,
    latitude,
    longitude,
    radiusMeters,
    maxAccuracyMeters:
      typeof maxAccuracyMeters === 'number' && Number.isFinite(maxAccuracyMeters)
        ? maxAccuracyMeters
        : null,
    isActive: true,
  };
}