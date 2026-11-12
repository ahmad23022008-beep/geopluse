// src/services/attendanceService.ts
import { supabase } from '../lib/supabase';
import { calculateDistanceMeters } from '../utils/calculateDistanceMeters';

// =====================================================
// TYPES — sesuai struktur tabel Supabase kamu
// =====================================================
export interface EmployeeDB {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  department: string;
  position: string;
  role: string;
  office_location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDB {
  id: string;
  employee_id: string;
  type: 'check_in' | 'check_out';
  attendance_date: string;
  checked_at: string;
  photo_captured_at: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_m: number | null;
  distance_to_office_m: number | null;
  is_within_geofence: boolean | null;
  office_id: string | null;
  address_label: string | null;
  verification_status: 'verified' | 'rejected' | 'pending';
  note: string | null;
}

export type VerifiedAttendanceDB = AttendanceDB & {
  photo_captured_at: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number;
  distance_to_office_m: number;
  is_within_geofence: true;
  office_id: string;
  verification_status: 'verified';
};

export interface AttendancePhotoEvidence {
  id: string;
  employee_id: string;
  type: 'check_in' | 'check_out';
  attendance_date: string;
  checked_at: string;
  photo_captured_at: string;
  photo_url: string;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_m: number | null;
  distance_to_office_m: number | null;
}

// =====================================================
// GET EMPLOYEE PROFILE
// =====================================================
export async function getEmployeeProfile(): Promise<EmployeeDB | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('Belum login. Silakan login dulu.');
    return null;
  }

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Gagal ambil profile:', error);
    return null;
  }
  return data;
}

// =====================================================
// GET OFFICE (untuk geofence)
// =====================================================
// =====================================================
// GET ATTENDANCE HISTORY
// =====================================================
export async function getAttendanceHistory(
  employeeId: string,
  limit = 30
): Promise<AttendanceDB[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .order('checked_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Gagal ambil history:', error);
    return [];
  }
  return data || [];
}

// =====================================================
// HITUNG JARAK (Haversine) — antara user & kantor
// =====================================================
export const calculateDistance = calculateDistanceMeters;

export interface AttendanceLocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  workLocationId: string;
}

export async function submitAttendance(
  type: 'check-in' | 'check-out',
  location: AttendanceLocationPayload,
  photo: Blob
): Promise<VerifiedAttendanceDB> {
  const apiUrl = import.meta.env.VITE_ATTENDANCE_API_URL?.replace(/\/+$/, '');
  if (!apiUrl) {
    throw new Error('Layanan absensi backend belum dikonfigurasi. Check-in tidak dikirim.');
  }

  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (sessionError || !accessToken) {
    throw new Error('Sesi login tidak valid. Silakan masuk kembali.');
  }

  const formData = new FormData();
  formData.append('latitude', String(location.latitude));
  formData.append('longitude', String(location.longitude));
  formData.append('accuracy', String(location.accuracy));
  formData.append('timestamp', location.timestamp);
  formData.append('workLocationId', location.workLocationId);
  formData.append('photo', photo, 'selfie.jpg');

  const response = await fetch(`${apiUrl}/api/attendance/${type}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'message' in result &&
      typeof result.message === 'string'
        ? result.message
        : `Server absensi menolak permintaan (${response.status}).`;
    throw new Error(message);
  }

  if (
    !result ||
    typeof result !== 'object' ||
    !('id' in result) ||
    typeof result.id !== 'string' ||
    !('checked_at' in result) ||
    typeof result.checked_at !== 'string' ||
    !('photo_captured_at' in result) ||
    typeof result.photo_captured_at !== 'string' ||
    !('latitude' in result) ||
    typeof result.latitude !== 'number' ||
    !Number.isFinite(result.latitude) ||
    !('longitude' in result) ||
    typeof result.longitude !== 'number' ||
    !Number.isFinite(result.longitude) ||
    !('gps_accuracy_m' in result) ||
    typeof result.gps_accuracy_m !== 'number' ||
    !Number.isFinite(result.gps_accuracy_m) ||
    !('distance_to_office_m' in result) ||
    typeof result.distance_to_office_m !== 'number' ||
    !Number.isFinite(result.distance_to_office_m) ||
    !('is_within_geofence' in result) ||
    result.is_within_geofence !== true ||
    !('office_id' in result) ||
    result.office_id !== location.workLocationId ||
    !('verification_status' in result) ||
    result.verification_status !== 'verified'
  ) {
    throw new Error('Server belum mengembalikan absensi dengan status verified.');
  }

  return result as VerifiedAttendanceDB;
}

export async function getAdminAttendancePhotos(limit = 50): Promise<AttendancePhotoEvidence[]> {
  const apiUrl = import.meta.env.VITE_ATTENDANCE_API_URL?.replace(/\/+$/, '');
  if (!apiUrl) {
    throw new Error('Layanan bukti foto backend belum dikonfigurasi.');
  }

  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (sessionError || !accessToken) {
    throw new Error('Sesi login tidak valid. Silakan masuk kembali.');
  }

  const response = await fetch(
    `${apiUrl}/api/admin/attendance-photos?limit=${encodeURIComponent(String(limit))}`,
    { headers: { Authorization: 'Bearer'.concat(' ', accessToken) } }
  );
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'message' in result &&
      typeof result.message === 'string'
        ? result.message
        : `Server bukti foto menolak permintaan (${response.status}).`;
    throw new Error(message);
  }
  if (!Array.isArray(result)) {
    throw new Error('Server mengembalikan daftar bukti foto yang tidak valid.');
  }

  return result.map((item: unknown) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('id' in item) ||
      typeof item.id !== 'string' ||
      !('employee_id' in item) ||
      typeof item.employee_id !== 'string' ||
      !('type' in item) ||
      (item.type !== 'check_in' && item.type !== 'check_out') ||
      !('attendance_date' in item) ||
      typeof item.attendance_date !== 'string' ||
      !('checked_at' in item) ||
      typeof item.checked_at !== 'string' ||
      !('photo_captured_at' in item) ||
      typeof item.photo_captured_at !== 'string' ||
      !('photo_url' in item) ||
      typeof item.photo_url !== 'string' ||
      !('latitude' in item) ||
      (item.latitude !== null && typeof item.latitude !== 'number') ||
      !('longitude' in item) ||
      (item.longitude !== null && typeof item.longitude !== 'number') ||
      !('gps_accuracy_m' in item) ||
      (item.gps_accuracy_m !== null && typeof item.gps_accuracy_m !== 'number') ||
      !('distance_to_office_m' in item) ||
      (item.distance_to_office_m !== null && typeof item.distance_to_office_m !== 'number')
    ) {
      throw new Error('Server mengembalikan metadata bukti foto yang tidak valid.');
    }

    return {
      id: item.id,
      employee_id: item.employee_id,
      type: item.type,
      attendance_date: item.attendance_date,
      checked_at: item.checked_at,
      photo_captured_at: item.photo_captured_at,
      photo_url: item.photo_url,
      latitude: item.latitude,
      longitude: item.longitude,
      gps_accuracy_m: item.gps_accuracy_m,
      distance_to_office_m: item.distance_to_office_m,
    };
  });
}