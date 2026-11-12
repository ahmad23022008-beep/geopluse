import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Fingerprint, CheckCircle2, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface BiometricModalProps {
  isOpen: boolean;
  type: 'masuk' | 'pulang';
  onClose: () => void;
  onSuccess: (type: 'masuk' | 'pulang') => void;
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  type,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'scan' | 'verifying' | 'success' | 'error'>('scan');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep('scan');
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartScan = () => {
    setStep('verifying');
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setStep('success');
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#3A4EFB', '#E3FF3B', '#33A4FA'],
        });
        setTimeout(() => {
          onSuccess(type);
          onClose();
        }, 1500);
      }
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-structural-border overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-xs font-semibold text-primary mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ENKRIPSI SHA-256 SATELLITE</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">
            {type === 'masuk' ? 'Konfirmasi Absen Masuk' : 'Konfirmasi Absen Pulang'}
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Gedung Menara Mandiri HQ • Geofence Radius 45m (Akurat ±3.8m)
          </p>
        </div>

        {/* Biometric Interactive Area */}
        <div className="flex flex-col items-center justify-center my-6">
          <div
            onClick={step === 'scan' ? handleStartScan : undefined}
            className={`relative w-28 h-28 rounded-full flex items-center justify-center cursor-pointer transition-all ${
              step === 'scan'
                ? 'bg-primary/10 hover:bg-primary/20 hover:scale-105 active:scale-95'
                : step === 'verifying'
                ? 'bg-secondary-container/20'
                : 'bg-tertiary-fixed/30'
            }`}
          >
            {/* Outer animated rings */}
            {step === 'verifying' && (
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            )}

            {step === 'success' ? (
              <CheckCircle2 className="w-16 h-16 text-primary animate-bounce" />
            ) : (
              <Fingerprint
                className={`w-16 h-16 transition-colors ${
                  step === 'verifying' ? 'text-secondary-container' : 'text-primary'
                }`}
              />
            )}
          </div>

          {/* Progress bar in verifying state */}
          {step === 'verifying' && (
            <div className="w-48 bg-surface-container-high h-2 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          <div className="text-center mt-4">
            {step === 'scan' && (
              <p className="text-sm font-semibold text-primary">
                Sentuh untuk memindai sidik jari / biometrik
              </p>
            )}
            {step === 'verifying' && (
              <p className="text-sm font-medium text-on-surface">
                Memvalidasi koordinat GPS & token perangkat... {progress}%
              </p>
            )}
            {step === 'success' && (
              <p className="text-sm font-bold text-tertiary-container">
                Presensi Berhasil Divalidasi! Menutup...
              </p>
            )}
          </div>
        </div>

        {/* Security telemetry strip */}
        <div className="bg-surface-container-low rounded-2xl p-3 flex items-center justify-between text-xs text-on-surface-variant font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tertiary-fixed"></span>
            <span>TOKEN: 8F2A-99B1</span>
          </div>
          <span className="text-primary font-semibold">ANTI-MOCK: SAFE</span>
        </div>

        {/* Action Button */}
        {step === 'scan' && (
          <button
            onClick={handleStartScan}
            className="w-full mt-5 py-3 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed font-bold text-sm tracking-wide shadow-md hover:bg-tertiary-fixed-dim transition-all flex items-center justify-center gap-2"
          >
            <Fingerprint className="w-4 h-4" />
            <span>Pindai Biometrik Sekarang</span>
          </button>
        )}
      </div>
    </div>
  );
};
