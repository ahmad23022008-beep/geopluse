import type { WorkLocation } from './workLocationService';
import { calculateDistanceMeters } from '../utils/calculateDistanceMeters';

export interface GeofencePosition {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

export type GeofenceStatus =
  | 'waiting'
  | 'invalid_location'
  | 'office_unavailable'
  | 'invalid_office'
  | 'accuracy_config_missing'
  | 'improving_accuracy'
  | 'outside'
  | 'inside';

export interface GeofenceResult {
  status: GeofenceStatus;
  distanceMeters: number | null;
  message: string;
}

export function verifyGeofence(
  position: GeofencePosition,
  office: WorkLocation | null
): GeofenceResult {
  const { latitude, longitude, accuracy, timestamp } = position;
  if (latitude === null || longitude === null || accuracy === null || timestamp === null) {
    return { status: 'waiting', distanceMeters: null, message: 'Menunggu sinyal GPS...' };
  }

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    !Number.isFinite(timestamp)
  ) {
    return {
      status: 'invalid_location',
      distanceMeters: null,
      message: 'Lokasi belum dapat ditentukan.',
    };
  }

  if (!office || !office.isActive) {
    return {
      status: 'office_unavailable',
      distanceMeters: null,
      message: 'Konfigurasi lokasi kantor aktif belum tersedia.',
    };
  }

  if (
    !Number.isFinite(office.latitude) ||
    office.latitude < -90 ||
    office.latitude > 90 ||
    !Number.isFinite(office.longitude) ||
    office.longitude < -180 ||
    office.longitude > 180 ||
    !Number.isFinite(office.radiusMeters) ||
    office.radiusMeters <= 0
  ) {
    return {
      status: 'invalid_office',
      distanceMeters: null,
      message: 'Konfigurasi koordinat atau radius kantor tidak valid.',
    };
  }

  const distanceMeters = calculateDistanceMeters(
    latitude,
    longitude,
    office.latitude,
    office.longitude
  );

  if (
    office.maxAccuracyMeters === null ||
    !Number.isFinite(office.maxAccuracyMeters) ||
    office.maxAccuracyMeters <= 0
  ) {
    return {
      status: 'accuracy_config_missing',
      distanceMeters,
      message: 'Batas akurasi GPS belum dikonfigurasi oleh backend.',
    };
  }

  if (accuracy > office.maxAccuracyMeters) {
    return {
      status: 'improving_accuracy',
      distanceMeters,
      message: `Akurasi GPS ±${Math.round(accuracy)} m belum memenuhi batas ±${office.maxAccuracyMeters} m.`,
    };
  }

  if (distanceMeters > office.radiusMeters) {
    return {
      status: 'outside',
      distanceMeters,
      message: 'Outside Authorized Area.',
    };
  }

  return {
    status: 'inside',
    distanceMeters,
    message: 'Inside Geofence. Persetujuan absensi tetap menunggu verifikasi server.',
  };
}