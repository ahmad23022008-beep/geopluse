import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
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

interface VerifyGpsPageProps {
  onConfirmAttendance: (
    type: 'masuk' | 'pulang',
    location: AttendanceLocationPayload,
    photo: Blob
  ) => Promise<VerifiedAttendanceDB>;
  attendanceType: 'masuk' | 'pulang';
  canSubmit: boolean;
  attendanceUnavailableReason: string | null;
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
  attendanceUnavailableReason,
}) => {
  const { startWatching, stopWatching, refreshLocation, ...gps } = useGeolocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgressRef = useRef(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    startWatching();
  }, [startWatching]);

  const isGpsReady =
    gps.latitude !== null &&
    Number.isFinite(gps.latitude) &&
    gps.latitude >= -90 &&
    gps.latitude <= 90 &&
    gps.longitude !== null &&
    Number.isFinite(gps.longitude) &&
    gps.longitude >= -180 &&
    gps.longitude <= 180 &&
    gps.accuracy !== null &&
    Number.isFinite(gps.accuracy) &&
    gps.accuracy > 0 &&
    gps.timestamp !== null &&
    Number.isFinite(gps.timestamp) &&
    !gps.error;
  const isReady = canSubmit && isGpsReady && !isSubmitting;

  const handleOpenCamera = () => {
    if (!isReady || submissionInProgressRef.current) return;

    setSubmissionError(null);
    setSubmissionMessage(null);
    setCameraError(null);
    setIsCameraOpen(true);
  };

  const handleConfirmAttendance = async (photo: Blob) => {
    if (
      !isReady ||
      submissionInProgressRef.current ||
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

  const statusIcon = isGpsReady ? (
    <CheckCircle2 className="w-5 h-5 text-tertiary-fixed" />
  ) : gps.error ? (
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
              BUKTI LOKASI GPS
            </span>
          </div>
          <span className="font-mono text-xs text-on-surface-variant font-medium">
            {formatTimestamp(gps.timestamp)}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface mt-1">
          Lokasi GPS & Kehadiran
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
          Presensi dapat dilakukan dari lokasi mana pun. GPS dan selfie dicatat sebagai bukti kehadiran.
        </p>
      </div>

      <section className="relative w-full min-h-72 sm:min-h-80 rounded-2xl overflow-hidden bg-[#161a33] shadow-card border border-structural-border flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(#3a4efb_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />

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
              {isGpsReady ? 'GPS siap untuk presensi' : 'Menunggu data GPS yang valid'}
            </span>
          </div>
          {(gps.error || gps.permissionStatus === 'denied') && (
            <p className="mt-3 max-w-md text-xs text-yellow-200">
              {gps.error || 'Aktifkan izin lokasi untuk situs ini melalui pengaturan browser.'}
              {gps.permissionStatus === 'denied' &&
                ' Setelah izin diubah, tekan Coba Lagi untuk memeriksa kembali.'}
            </p>
          )}
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
            <span className="text-[11px] text-on-surface-variant">Status GPS</span>
            <span className="text-xs font-bold text-on-surface font-mono">
              {isGpsReady ? 'Siap' : 'Belum siap'}
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

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Lokasi GPS dicatat untuk pemantauan. Tidak ada batas radius kantor untuk check-in atau check-out.</span>
      </div>
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
      {attendanceUnavailableReason && (
        <div
          className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{attendanceUnavailableReason}</span>
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
        <span>Foto dan data GPS dikirim untuk verifikasi kehadiran.</span>
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