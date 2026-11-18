import React from 'react';
import { AttendanceRecord } from '../types/attendance';
import { X, MapPin } from 'lucide-react';

interface LocationDetailModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;
  const coordinates = record.coordinates?.accuracyMeters !== undefined
    ? `${record.coordinates.lat.toFixed(6)}, ${record.coordinates.lng.toFixed(6)}`
    : 'Koordinat tidak tersedia';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-structural-border overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary text-xs font-semibold mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>LOKASI GPS KEHADIRAN</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface">
            {record.dateFormatted}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {record.shift} • Jam Kerja: {record.checkIn || '-'} - {record.checkOut || '-'} ({record.duration || '-'})
          </p>
        </div>

        {/* Local coordinate view avoids sending employee location to a third-party map provider. */}
        <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-[#161a33] mb-4 border border-structural-border flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(#3a4efb_1px,transparent_1px)] [background-size:16px_16px] opacity-25"></div>
          <div className="relative z-10 flex flex-col items-center gap-2 text-center">
            {record.coordinates?.accuracyMeters !== undefined && (
              <MapPin className="h-9 w-9 text-tertiary-fixed drop-shadow-lg" />
            )}
            <span className="rounded-lg bg-[#161a33]/90 px-3 py-1.5 font-mono text-xs font-semibold text-white">
              {coordinates}
            </span>
          </div>

          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-[#bdc2ff] bg-[#212644]/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
            <span>GPS snapshot</span>
            <span className="font-mono text-tertiary-fixed font-semibold">{record.dateFormatted}</span>
          </div>
        </div>

        {/* Telemetry details breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Titik Check-In:</span>
            <span className="font-semibold text-on-surface">{record.checkInLocation || 'Lokasi tidak tersedia'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Titik Check-Out:</span>
            <span className="font-semibold text-on-surface">{record.checkOutLocation || 'Lokasi tidak tersedia'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Koordinat Lat/Lng:</span>
            <span className="font-mono text-on-surface font-medium">
              {coordinates}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Akurasi GPS:</span>
            <span className="font-mono text-on-surface font-medium">
              {record.coordinates?.accuracyMeters !== undefined
                ? `±${record.coordinates.accuracyMeters.toFixed(1)} m`
                : 'Tidak tersedia'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs hover:bg-surface-container-highest transition-colors"
        >
          Tutup Detail Audit
        </button>
      </div>
    </div>
  );
};
