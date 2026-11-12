import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Fingerprint,
  LoaderCircle,
  Lock,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Satellite,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { SelfieCameraModal } from '../components/SelfieCameraModal';
import { useGeolocation } from '../hooks/useGeolocation';
import type {
  AttendanceLocationPayload,
  VerifiedAttendanceDB,
} from '../services/attendanceService';
import { verifyGeofence } from '../services/geofenceService';
import { getActiveWorkLocation, type WorkLocation } from '../services/workLocationService';

interface VerifyGpsPageProps {
  onConfirmAttendance: (
    type: 'masuk' | 'pulang',
    location: AttendanceLocationPayload,
    photo: Blob
  ) => Promise<VerifiedAttendanceDB>;
  attendanceType: 'masuk' | 'pulang';
  canSubmit: boolean;
}

function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null) return 'Belum tersedia';
  return new Date(timestamp).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

export const VerifyGpsPage: React.FC<VerifyGpsPageProps> = ({
  onConfirmAttendance,
  attendanceType,
  canSubmit,
}) => {
  const { startWatching, stopWatching, refreshLocation, ...gps } = useGeolocation();
  const [office, setOffice] = useState<WorkLocation | null>(null);
  const [officeLoading, setOfficeLoading] = useState(true);
  const [officeError, setOfficeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgressRef = useRef(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    startWatching();
    let mounted = true;

    void getActiveWorkLocation()
      .then((activeOffice) => {
        if (!mounted) return;
        setOffice(activeOffice);
        setOfficeError(null);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setOffice(null);
        setOfficeError(
          error instanceof Error ? error.message : 'Gagal mengambil lokasi kantor dari server.'
        );
      })
      .finally(() => {
        if (mounted) setOfficeLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [startWatching]);

  const geofence = verifyGeofence(gps, office);
  const isReady = canSubmit && geofence.status === 'inside' && !isSubmitting;

  const handleOpenCamera = () => {
    if (!isReady || submissionInProgressRef.current || !office || gps.latitude === null || gps.longitude === null ||
      gps.accuracy === null || gps.timestamp === null) return;

    setSubmissionError(null);
    setSubmissionMessage(null);
    setCameraError(null);
    setIsCameraOpen(true);
  };

  const handleConfirmAttendance = async (photo: Blob) => {
    const currentGeofence = verifyGeofence(gps, office);
    if (
      !isReady ||
      submissionInProgressRef.current ||
      !office ||
      currentGeofence.status !== 'inside' ||
      gps.latitude === null ||
      gps.longitude === null ||
      gps.accuracy === null ||
      gps.timestamp === null
    ) {
      const message = 'Lokasi atau akurasi GPS tidak lagi memenuhi validasi. Periksa GPS sebelum mengonfirmasi foto.';
      setCameraError(message);
      setSubmissionError(message);
      return;
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);
    setCameraError(null);
    setSubmissionError(null);

    try {
      const attendance = await onConfirmAttendance(attendanceType, {
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy,
        timestamp: new Date(gps.timestamp).toISOString(),
        workLocationId: office.id,
      }, photo);

      if (attendance.verification_status !== 'verified') {
        throw new Error('Server belum menyetujui absensi ini.');
      }

      setSubmissionMessage(
        attendanceType === 'masuk'
          ? 'Check-in disetujui server.'
          : 'Check-out disetujui server.'
      );
      stopWatching();
      setIsCameraOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server gagal memproses absensi.';
      setSubmissionError(message);
      setCameraError(message);
    } finally {
      submissionInProgressRef.current = false;
      setIsSubmitting(false);
    }
  };

  const gpsStatus = gps.error
    ? gps.permissionStatus === 'denied'
      ? 'Izin lokasi ditolak'
      : 'Lokasi belum tersedia'
    : gps.latitude !== null
    ? 'GPS aktif, lokasi terdeteksi'
    : gps.loading
    ? gps.permissionStatus === 'prompt'
      ? 'Meminta izin lokasi...'
      : 'Mencari sinyal GPS...'
    : 'Menunggu sinyal GPS...';

  const statusIcon =
    geofence.status === 'inside' ? (
      <CheckCircle2 className="w-5 h-5 text-tertiary-fixed" />
    ) : geofence.status === 'outside' || geofence.status === 'invalid_location' ? (
      <AlertTriangle className="w-5 h-5 text-red-400" />
    ) : (
      <Radio className="w-5 h-5 text-yellow-400" />
    );

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full pb-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1 rounded-full">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs text-on-surface-variant font-medium">
              VERIFIKASI LOKASI PERANGKAT
            </span>
          </div>
          <span className="font-mono text-xs text-on-surface-variant font-medium">
            {formatTimestamp(gps.timestamp)}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface mt-1">
          Verifikasi Lokasi & GPS
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
          Check-in hanya dapat dikirim setelah lokasi aktual dan geofence terverifikasi.
        </p>
      </div>

      <section className="relative w-full min-h-72 sm:min-h-80 rounded-2xl overflow-hidden bg-[#161a33] shadow-card border border-structural-border flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(#3a4efb_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 bg-[#1e2238]/90 px-3 py-1.5 rounded-full border border-[#353c63] min-w-0">
            <Building className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-white font-semibold truncate">
              {officeLoading ? 'Memuat lokasi kantor...' : office?.name ?? 'Kantor belum tersedia'}
            </span>
          </div>
          <span className="font-mono text-xs text-white bg-[#1e2238]/90 px-3 py-1.5 rounded-full border border-[#353c63] shrink-0">
            {office?.radiusMeters ? `${office.radiusMeters}m radius` : 'Radius belum tersedia'}
          </span>
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center text-center text-white">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-[#59618e] bg-[#252b4d]">
            {gps.loading ? (
              <LoaderCircle className="h-8 w-8 animate-spin text-tertiary-fixed" />
            ) : gps.error ? (
              <ShieldAlert className="h-8 w-8 text-yellow-300" />
            ) : (
              <MapPin className="h-8 w-8 text-tertiary-fixed" />
            )}
          </div>
          <p className="font-semibold">{gpsStatus}</p>
          <p className="mt-2 break-all font-mono text-xs text-[#bdc2ff]">
            {gps.latitude !== null && gps.longitude !== null
              ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`
              : 'Lokasi belum dapat ditentukan.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <span className="rounded-full border border-[#59618e] bg-[#1e2238]/90 px-3 py-1.5">
              Izin: {gps.permissionStatus}
            </span>
            <span className="rounded-full border border-[#59618e] bg-[#1e2238]/90 px-3 py-1.5">
              Akurasi: {gps.accuracy !== null ? `±${Math.round(gps.accuracy)} m` : 'Belum tersedia'}
            </span>
            <span className="rounded-full border border-[#59618e] bg-[#1e2238]/90 px-3 py-1.5">
              {officeLoading ? 'Memeriksa geofence...' : geofence.message}
            </span>
          </div>
          {(gps.error || gps.permissionStatus === 'denied') && (
            <p className="mt-3 max-w-md text-xs text-yellow-200">
              {gps.error || 'Aktifkan izin lokasi untuk situs ini melalui pengaturan browser.'}
              {gps.permissionStatus === 'denied' &&
                ' Setelah izin diubah, tekan Coba Lagi untuk memeriksa kembali.'}
            </p>
          )}
          {officeError && <p className="mt-3 text-xs text-red-200">{officeError}</p>}
        </div>

        <button
          aria-label="Coba lagi membaca lokasi"
          className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#59618e] bg-[#1e2238] text-white transition-colors hover:bg-[#30375d]"
          onClick={refreshLocation}
          title="Coba lagi"
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-card border border-structural-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
          <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center justify-center min-w-0">
            <Navigation className="w-4 h-4 text-on-surface-variant mb-1" />
            <span className="text-[11px] text-on-surface-variant">Latitude</span>
            <span className="w-full truncate text-xs font-bold text-on-surface font-mono">
              {gps.latitude?.toFixed(6) ?? 'Belum tersedia'}
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center justify-center min-w-0">
            <Navigation className="w-4 h-4 text-on-surface-variant mb-1" />
            <span className="text-[11px] text-on-surface-variant">Longitude</span>
            <span className="w-full truncate text-xs font-bold text-on-surface font-mono">
              {gps.longitude?.toFixed(6) ?? 'Belum tersedia'}
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center justify-center">
            <Satellite className="w-4 h-4 text-on-surface-variant mb-1" />
            <span className="text-[11px] text-on-surface-variant">Akurasi GPS</span>
            <span className="text-xs font-bold text-on-surface font-mono">
              {gps.accuracy !== null ? `±${gps.accuracy.toFixed(1)} m` : 'Belum tersedia'}
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center justify-center">
            {statusIcon}
            <span className="text-[11px] text-on-surface-variant">Jarak ke kantor</span>
            <span className="text-xs font-bold text-on-surface font-mono">
              {geofence.distanceMeters !== null
                ? `${Math.round(geofence.distanceMeters)} m`
                : 'Belum tersedia'}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-structural-border/60 pt-3 text-xs">
          <span className="text-on-surface-variant">Pembaruan terakhir: {formatTimestamp(gps.timestamp)}</span>
          <span className="font-semibold text-on-surface-variant">
            Izin browser: {gps.permissionStatus}
          </span>
        </div>
      </section>

      {geofence.status === 'inside' && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Lokasi terdeteksi di dalam geofence. Persetujuan absensi tetap menunggu verifikasi backend.</span>
        </div>
      )}
      {submissionMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submissionMessage}</span>
        </div>
      )}
      {submissionError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {geofence.status === 'accuracy_config_missing' && (
        <div className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Batas akurasi belum tersedia di konfigurasi backend; presensi dinonaktifkan sampai backend menetapkannya.</span>
        </div>
      )}

      <button
        className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
          isReady
            ? 'bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim active:scale-[0.99] cursor-pointer'
            : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-60'
        }`}
        disabled={!isReady}
        onClick={handleOpenCamera}
        type="button"
      >
        <Fingerprint className="w-5 h-5" />
        <span>
          {attendanceType === 'masuk'
            ? 'Konfirmasi Check In'
            : 'Konfirmasi Check Out'}
        </span>
      </button>

      <div className="flex items-center justify-center gap-1 text-[11px] text-on-surface-variant font-mono">
        <Lock className="w-3 h-3" />
        <span>Lokasi terdeteksi bukan persetujuan absensi.</span>
      </div>
      <SelfieCameraModal
        isOpen={isCameraOpen}
        isSubmitting={isSubmitting}
        errorMessage={cameraError}
        onCancel={() => {
          if (isSubmitting) return;
          setIsCameraOpen(false);
          setCameraError(null);
        }}
        onConfirm={(photo) => void handleConfirmAttendance(photo)}
      />
    </div>
  );
};