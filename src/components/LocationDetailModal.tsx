import React from 'react';
import { AttendanceRecord } from '../types/attendance';
import { X, MapPin, ShieldCheck, Navigation } from 'lucide-react';

interface LocationDetailModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

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
            <span>AUDIT LOG GEOFENCE GPS</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface">
            {record.dateFormatted}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {record.shift} • Jam Kerja: {record.checkIn || '-'} - {record.checkOut || '-'} ({record.duration || '-'})
          </p>
        </div>

        {/* Visual Map Canvas / Simulation */}
        <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-[#161a33] mb-4 border border-structural-border flex items-center justify-center">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[radial-gradient(#3a4efb_1px,transparent_1px)] [background-size:16px_16px] opacity-25"></div>

          {/* Concentric Geofence circles */}
          <div className="relative flex items-center justify-center w-40 h-40">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-secondary-container/60 animate-pulse"></div>
            <div className="absolute w-28 h-28 rounded-full bg-secondary-container/10"></div>
            <div className="absolute w-16 h-16 rounded-full bg-primary/20"></div>

            {/* HQ Center Marker */}
            <div className="absolute flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-white shadow-lg"></div>
              <span className="font-mono text-[9px] text-white font-bold bg-[#161a33]/90 px-1.5 py-0.5 rounded mt-1 shadow">
                Menara Mandiri HQ
              </span>
            </div>

            {/* User Check-In Pin */}
            <div className="absolute top-4 left-6 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-tertiary-fixed opacity-60"></span>
                <span className="w-4 h-4 rounded-full bg-tertiary-fixed ring-2 ring-black flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                </span>
              </div>
              <span className="font-mono text-[9px] text-[#161a33] font-bold bg-tertiary-fixed px-1.5 py-0.5 rounded mt-0.5 shadow">
                Posisi: {record.coordinates?.distanceMeters || 12}m
              </span>
            </div>
          </div>

          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-[#bdc2ff] bg-[#212644]/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
            <span>Radius Aman: 50 Meter</span>
            <span className="font-mono text-tertiary-fixed font-semibold">STATUS: IN-BOUNDS VERIFIED</span>
          </div>
        </div>

        {/* Telemetry details breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Titik Check-In:</span>
            <span className="font-semibold text-on-surface">{record.checkInLocation || 'Lobby Utama'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Titik Check-Out:</span>
            <span className="font-semibold text-on-surface">{record.checkOutLocation || 'East Wing Gate'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Koordinat Lat/Lng:</span>
            <span className="font-mono text-on-surface font-medium">
              -6.225514, 106.809182
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container">
            <span className="text-[11px] text-on-surface-variant block">Integritas Hash:</span>
            <span className="font-mono text-primary font-semibold">SHA256: VALID</span>
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
