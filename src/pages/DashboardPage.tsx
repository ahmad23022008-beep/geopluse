import React, { useState, useEffect } from 'react';
import { PageId, AttendanceStatus, EmployeeProfile, AttendanceRecord } from '../types/attendance';
import { ServiceModalType } from '../components/SelfServiceModal';
import {
  Fingerprint,
  LogOut,
  Radio,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface DashboardPageProps {
  profile: EmployeeProfile;
  attendanceStatus: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  recentRecords: AttendanceRecord[];
  onOpenBiometric: (type: 'masuk' | 'pulang') => void;
  onOpenServiceModal: (type: ServiceModalType) => void;
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  profile,
  attendanceStatus,
  checkInTime,
  checkOutTime,
  recentRecords,
  onOpenBiometric,
  onOpenServiceModal,
  onNavigate,
}) => {
  const [hours, setHours] = useState('08');
  const [minutes, setMinutes] = useState('42');
  const [seconds, setSeconds] = useState('18');
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHours(String(now.getHours()).padStart(2, '0'));
      setMinutes(String(now.getMinutes()).padStart(2, '0'));
      setSeconds(String(now.getSeconds()).padStart(2, '0'));

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      setCurrentDateStr(now.toLocaleDateString('id-ID', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full pb-8">
      {/* Top Employee Greeting & Precision Clock Strip */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-card border border-structural-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary bg-secondary-fixed/60 px-2.5 py-0.5 rounded-full">
              {profile.division}
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              {profile.employeeId}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface bg-surface-container px-2.5 py-0.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
            <span>WIB (UTC+7)</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1 flex-wrap gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Selamat Pagi, {profile.name}
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {currentDateStr || 'Senin, 24 Oktober 2024'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-primary-container tracking-tight font-mono flex items-center justify-end tabular-nums">
              <span>{hours}</span>
              <span className="animate-pulse mx-0.5 text-primary">:</span>
              <span>{minutes}</span>
              <span className="animate-pulse mx-0.5 text-primary">:</span>
              <span className="text-primary">{seconds}</span>
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Live Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* Grid for Hero Geofence Attendance Card & Live Radar Mini Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero Geofence Attendance Card (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container p-5 sm:p-6 shadow-xl text-white">
          {/* Decorative Radar watermark */}
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="absolute right-4 bottom-2 opacity-10 pointer-events-none">
            <Radio className="w-32 h-32" />
          </div>

          <div className="relative z-10 flex flex-col gap-3.5">
            {/* Status Badges Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-on-tertiary-fixed opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-on-tertiary-fixed"></span>
                </span>
                <span>Lokasi belum diverifikasi</span>
              </div>
              <span className="font-mono text-[11px] text-[#e2e3ff] bg-primary/40 px-2.5 py-0.5 rounded-full border border-white/20">
                Geofence menunggu GPS aktual
              </span>
            </div>

            {/* Telemetry Details Strip */}
            <div className="flex items-center gap-2 text-white/90 text-xs pt-0.5">
              <ShieldCheck className="w-4 h-4 text-tertiary-fixed shrink-0" />
              <span>Buka Verifikasi GPS untuk membaca lokasi perangkat</span>
            </div>

            {/* Check In / Out Interactive Action Matrix */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Large Hero Clock-In Button */}
              <button
                onClick={() => onOpenBiometric('masuk')}
                disabled={attendanceStatus === 'clocked_in'}
                className={`group relative overflow-hidden flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                  attendanceStatus === 'clocked_in'
                    ? 'bg-[#1e2238]/80 text-[#8e93b2] cursor-not-allowed opacity-75'
                    : 'bg-[#161a33] text-tertiary-fixed shadow-lg hover:shadow-xl hover:bg-[#1f2444]'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                      attendanceStatus === 'clocked_in'
                        ? 'bg-[#2b3050] text-[#8e93b2]'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed group-hover:scale-105'
                    }`}
                  >
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold leading-none tracking-tight">
                      {attendanceStatus === 'clocked_in' ? 'SUDAH MASUK' : 'ABSEN MASUK'}
                    </span>
                    <span className="text-[11px] text-white/70 mt-1">
                      {attendanceStatus === 'clocked_in'
                        ? `Tercatat: ${checkInTime || '08:48 WIB'}`
                        : 'Jadwal: 09:00 WIB'}
                    </span>
                  </div>
                </div>
                {attendanceStatus === 'clocked_in' ? (
                  <CheckCircle2 className="w-5 h-5 text-tertiary-fixed" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-tertiary-fixed group-hover:translate-x-1 transition-transform" />
                )}
              </button>

              {/* Secondary Clock-Out Button */}
              <button
                onClick={() => onOpenBiometric('pulang')}
                disabled={attendanceStatus !== 'clocked_in'}
                className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                  attendanceStatus === 'clocked_in'
                    ? 'bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-[0.98]'
                    : 'bg-white/10 backdrop-blur-md text-white/40 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold leading-none text-white">
                      ABSEN PULANG
                    </span>
                    <span className="text-[11px] text-white/70 mt-1">
                      {attendanceStatus === 'clocked_in'
                        ? 'Klik untuk presensi pulang'
                        : 'Buka Pukul 18:00 WIB'}
                    </span>
                  </div>
                </div>
                {attendanceStatus === 'clocked_in' ? (
                  <ChevronRight className="w-5 h-5 text-white" />
                ) : (
                  <Lock className="w-4 h-4 text-white/40" />
                )}
              </button>
            </div>

            {/* Bottom biometric badge */}
            <div className="text-[11px] text-white/80 flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"></span>
              <span>Lokasi dan status absensi menunggu verifikasi server</span>
            </div>
          </div>
        </div>

        {/* Radar Geofence Live Mini Preview Card */}
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-card border border-structural-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-on-surface font-bold text-xs">
              <Radio className="w-4 h-4 text-primary" />
              <span>Radar Geofence Live</span>
            </div>
            <span className="text-[11px] font-mono text-tertiary-container bg-tertiary-fixed/40 px-2 py-0.5 rounded-full font-semibold">
              Belum diperiksa
            </span>
          </div>

          {/* Interactive Mini Radar Visual */}
          <div className="relative w-full h-36 rounded-xl bg-[#161a33] overflow-hidden flex items-center justify-center border border-structural-border my-2">
            {/* Grid circles */}
            <div className="absolute w-28 h-28 rounded-full border border-secondary/30"></div>
            <div className="absolute w-20 h-20 rounded-full border border-tertiary-fixed/30 bg-tertiary-fixed/5"></div>
            <div className="absolute w-12 h-12 rounded-full border border-primary/40"></div>

            {/* Radar beam rotation */}
            <div className="absolute w-28 h-28 rounded-full border-r-2 border-tertiary-fixed opacity-40 animate-radar-sweep pointer-events-none"></div>

            {/* User Location Pin */}
            <div className="relative flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-tertiary-fixed ring-4 ring-primary/50 shadow-md flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#161a33]"></span>
              </div>
              <span className="font-mono text-[9px] text-white bg-[#161a33]/90 px-1.5 py-0.2 rounded mt-1 font-semibold">
                Posisi belum tersedia
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-on-surface-variant truncate max-w-[150px]">
              Lokasi kantor dimuat saat verifikasi
            </span>
            <button
              onClick={() => onNavigate('verification-gps')}
              className="text-xs font-semibold text-primary hover:text-primary-container flex items-center gap-0.5 transition-colors"
            >
              <span>Peta Penuh</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Hari Ini (Today's Summary) */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-card border border-structural-border flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface">Ringkasan Hari Ini</h2>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
              attendanceStatus === 'clocked_in'
                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {attendanceStatus === 'clocked_in' ? 'Tepat Waktu' : 'Belum Absen'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
              <Clock className="w-3 h-3 text-primary" />
              <span>Masuk</span>
            </div>
            <span className="text-base sm:text-lg font-bold font-mono text-on-surface mt-1">
              {checkInTime || '- - : - -'}
            </span>
            <span className="text-[10px] text-on-surface-variant">Target 09:00</span>
          </div>

          <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
              <LogOut className="w-3 h-3 text-secondary" />
              <span>Pulang</span>
            </div>
            <span className="text-base sm:text-lg font-bold font-mono text-on-surface mt-1">
              {checkOutTime || '- - : - -'}
            </span>
            <span className="text-[10px] text-on-surface-variant">Target 18:00</span>
          </div>

          <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
              <Clock className="w-3 h-3 text-tertiary-container" />
              <span>Jam Kerja</span>
            </div>
            <span className="text-base sm:text-lg font-bold font-mono text-on-surface mt-1">
              {attendanceStatus === 'clocked_in' ? '0j 42m' : '0j 0m'}
            </span>
            <span className="text-[10px] text-on-surface-variant">Min. 8 Jam</span>
          </div>
        </div>
      </div>

      {/* Layanan Kehadiran Mandiri (Self-Service Matrix) */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-on-surface px-1">
          Layanan Kehadiran Mandiri
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <button
            onClick={() => onOpenServiceModal('izin')}
            className="bg-surface-container-lowest p-3 rounded-2xl shadow-card border border-structural-border flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-200 transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-on-surface">Izin / Sakit</span>
          </button>

          <button
            onClick={() => onOpenServiceModal('lembur')}
            className="bg-surface-container-lowest p-3 rounded-2xl shadow-card border border-structural-border flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 text-primary flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-on-surface">Lembur</span>
          </button>

          <button
            onClick={() => onOpenServiceModal('tukar_shift')}
            className="bg-surface-container-lowest p-3 rounded-2xl shadow-card border border-structural-border flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-secondary flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-on-surface">Tukar Shift</span>
          </button>

          <button
            onClick={() => onOpenServiceModal('slip_absen')}
            className="bg-surface-container-lowest p-3 rounded-2xl shadow-card border border-structural-border flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-primary-container flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-on-surface">Slip Absen</span>
          </button>
        </div>
      </div>

      {/* Riwayat 3 Hari Terakhir (Recent 3 Days) */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-card border border-structural-border flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface">Riwayat 3 Hari Terakhir</h2>
          <button
            onClick={() => onNavigate('attendance-history')}
            className="text-xs font-semibold text-primary hover:text-primary-container flex items-center gap-0.5 transition-colors"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {recentRecords.slice(0, 3).map((record) => (
            <div
              key={record.id}
              className="p-3 rounded-xl bg-surface-container-low border border-structural-border/60 flex items-center justify-between hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    record.status === 'tepat_waktu'
                      ? 'bg-tertiary-fixed/30 text-tertiary-container'
                      : record.status === 'terlambat'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {record.status === 'tepat_waktu' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : record.status === 'terlambat' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">
                    {record.dateFormatted}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    {record.checkIn ? `${record.checkIn} - ${record.checkOut || 'Selesai'}` : record.shift} • {record.duration || 'Izin'}
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  record.status === 'tepat_waktu'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : record.status === 'terlambat'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {record.statusLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
