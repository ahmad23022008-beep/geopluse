import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';

interface SelfieCameraModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (photo: Blob) => void;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function SelfieCameraModal({
  isOpen,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm,
}: SelfieCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const photoUrl = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    if (!isOpen) {
      setPhoto(null);
      setCameraError(null);
    }
  }, [isOpen]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (!isOpen || photo) return;

    let cancelled = false;
    setCameraError(null);

    const startCamera = async () => {
      if (!window.isSecureContext) {
        setCameraError('Kamera hanya dapat digunakan melalui HTTPS atau localhost.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Browser ini tidak menyediakan akses kamera.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (document.visibilityState === 'hidden') {
          stream.getTracks().forEach((track) => track.stop());
          setCameraError('Kamera dihentikan saat aplikasi berada di latar belakang. Tekan Coba Lagi untuk melanjutkan.');
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : '';
        setCameraError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi.'
            : name === 'NotFoundError' || name === 'DevicesNotFoundError'
            ? 'Kamera tidak ditemukan pada perangkat ini.'
            : 'Kamera tidak dapat dibuka. Periksa izin dan koneksi kamera perangkat.'
        );
        stopCamera();
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraAttempt, isOpen, photo]);

  useEffect(() => {
    if (!isOpen || photo) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopCamera();
        setCameraError('Kamera dihentikan saat aplikasi berada di latar belakang. Tekan Coba Lagi untuk melanjutkan.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, photo]);

  if (!isOpen) return null;

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Tunggu hingga pratinjau kamera siap, lalu ambil foto kembali.');
      return;
    }

    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Pratinjau foto tidak dapat diproses pada perangkat ini.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (capturedPhoto) => {
        if (!isOpenRef.current) return;
        if (!capturedPhoto) {
          setCameraError('Foto gagal diproses. Silakan coba lagi.');
          return;
        }
        if (capturedPhoto.size > MAX_PHOTO_BYTES) {
          setCameraError('Ukuran foto melebihi batas 5 MB. Ulangi dengan pencahayaan yang cukup.');
          return;
        }
        stopCamera();
        setCameraError(null);
        setPhoto(capturedPhoto);
      },
      'image/jpeg',
      0.82
    );
  };

  const handleRetake = () => {
    setPhoto(null);
    setCameraAttempt((attempt) => attempt + 1);
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    stopCamera();
    setPhoto(null);
    setCameraError(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section
        aria-labelledby="selfie-camera-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-structural-border bg-surface-container-lowest p-4 shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="selfie-camera-title" className="text-lg font-bold text-on-surface">
              Foto Selfie Presensi
            </h2>
            <p className="text-xs text-on-surface-variant">
              Kamera hanya aktif selama proses foto ini.
            </p>
          </div>
          <button
            aria-label="Batal"
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"
            disabled={isSubmitting}
            onClick={handleCancel}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-black">
          {photo && photoUrl ? (
            <img
              alt="Pratinjau foto selfie presensi"
              className="max-h-[60vh] w-full object-contain"
              src={photoUrl}
            />
          ) : cameraError ? (
            <div className="flex min-h-56 items-center justify-center p-6 text-center text-sm text-white">
              {cameraError}
            </div>
          ) : (
            <video
              autoPlay
              className="max-h-[60vh] w-full object-contain"
              muted
              playsInline
              ref={videoRef}
            />
          )}
        </div>

        {(cameraError || errorMessage) && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {errorMessage || cameraError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {photo ? (
            <>
              <button
                className="rounded-xl border border-structural-border px-4 py-2 text-sm font-semibold text-on-surface"
                disabled={isSubmitting}
                onClick={handleRetake}
                type="button"
              >
                Ulangi
              </button>
              <button
                className="rounded-xl border border-structural-border px-4 py-2 text-sm font-semibold text-on-surface"
                disabled={isSubmitting}
                onClick={handleCancel}
                type="button"
              >
                Batal
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={isSubmitting}
                onClick={() => onConfirm(photo)}
                type="button"
              >
                {isSubmitting ? 'Mengirim...' : 'Konfirmasi'}
              </button>
            </>
          ) : cameraError ? (
            <>
              <button
                className="rounded-xl border border-structural-border px-4 py-2 text-sm font-semibold text-on-surface"
                onClick={handleCancel}
                type="button"
              >
                Batal
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setCameraAttempt((attempt) => attempt + 1)}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
            </>
          ) : (
            <>
              <button
                className="rounded-xl border border-structural-border px-4 py-2 text-sm font-semibold text-on-surface"
                onClick={handleCancel}
                type="button"
              >
                Batal
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                onClick={handleCapture}
                type="button"
              >
                <Camera className="h-4 w-4" />
                Ambil Foto
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
