import React, { useState } from 'react';
import { EmployeeProfile } from '../types/attendance';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Building,
  Smartphone,
  Lock,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  TrendingUp,
  Radio,
} from 'lucide-react';

interface ProfilePageProps {
  profile: EmployeeProfile;
  onToggleBiometric: () => void;
  onLogout: () => void;
  onShowNotice: (title: string, msg: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  onToggleBiometric,
  onLogout,
  onShowNotice,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full pb-10">
      {/* Breadcrumb & Status Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
          <User className="w-4 h-4 text-primary" />
          <span className="font-semibold text-on-surface">
            Profil & Pengaturan Akun
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container shadow-sm">
          <span className="w-2 h-2 rounded-full bg-tertiary-fixed"></span>
          <span className="font-mono text-xs text-on-surface font-semibold">
            AKTIF 2024
          </span>
        </div>
      </div>

      {/* Employee Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-5 sm:p-6 shadow-card border border-structural-border">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-tertiary-fixed/20 blur-2xl pointer-events-none"></div>

        <div className="relative flex flex-col gap-4">
          <div className="flex items-center sm:items-start gap-4">
            {/* Avatar Container with Verified Badge */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-high shadow-md ring-2 ring-primary/20">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-tertiary-fixed flex items-center justify-center shadow-md ring-2 ring-white">
                <CheckCircle2 className="w-4 h-4 text-on-tertiary-fixed font-bold" />
              </div>
            </div>

            {/* Name & ID Info */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <h2 className="text-lg sm:text-xl font-bold text-on-surface truncate">
                {profile.name}, {profile.degree}
              </h2>
              <div className="flex items-center gap-1.5 text-on-surface-variant mt-1 text-xs">
                <span className="font-mono font-bold text-primary">
                  {profile.employeeId}
                </span>
                <span>•</span>
                <span className="truncate">{profile.division}</span>
              </div>
              <div className="mt-2.5 flex items-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-xs font-semibold text-on-surface shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                  <span>{profile.status}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Live GPS Geofence sync micro-strip */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-container-low text-xs">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-container"></span>
              </div>
              <span className="text-on-surface-variant font-medium">
                Sinkronisasi Geofence Kantor Terakhir
              </span>
            </div>
            <span className="font-mono text-on-surface font-bold">
              {profile.lastSyncTime}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Row (3 Metrics Cards) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {/* Stat 1: Attendance Score */}
        <div className="flex flex-col p-4 rounded-2xl bg-surface-container-lowest shadow-card border border-structural-border justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Skor Hadir
            </span>
            <CheckCircle2 className="w-4 h-4 text-tertiary-container" />
          </div>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-bold text-tertiary-container tracking-tight">
              {profile.attendanceScore}%
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"></span>
            <span>Sangat Patuh</span>
          </div>
        </div>

        {/* Stat 2: Avg Check-in Time */}
        <div className="flex flex-col p-4 rounded-2xl bg-surface-container-lowest shadow-card border border-structural-border justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Rata-rata Masuk
            </span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight font-mono">
              {profile.avgCheckInTime}
            </span>
            <span className="text-xs text-on-surface-variant ml-1">WIB</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-secondary">
            <TrendingUp className="w-3 h-3" />
            <span>-15m Toleransi</span>
          </div>
        </div>

        {/* Stat 3: Leave Balance */}
        <div className="flex flex-col p-4 rounded-2xl bg-surface-container-lowest shadow-card border border-structural-border justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Sisa Cuti
            </span>
            <Calendar className="w-4 h-4 text-secondary-container" />
          </div>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              {profile.leaveBalanceDays}
            </span>
            <span className="text-xs text-on-surface-variant ml-1">Hari</span>
          </div>
          <span className="text-[11px] text-on-surface-variant">Th. 2024/2025</span>
        </div>
      </div>

      {/* Informasi Pekerjaan & Kantor */}
      <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-card border border-structural-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">
              Informasi Pekerjaan & Kantor
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-container text-secondary">
            Head Office
          </span>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-primary flex items-center justify-center shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant font-medium">
                Lokasi Penugasan
              </span>
              <span className="font-bold text-on-surface mt-0.5">
                {profile.assignedLocation}
              </span>
              <span className="text-[11px] text-secondary mt-0.5">
                Radius Geofence: {profile.geofenceRadiusMeters}m • Terkunci Presisi
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-primary flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant font-medium">
                Shift Default
              </span>
              <span className="font-bold text-on-surface mt-0.5">
                {profile.shiftDefault}
              </span>
              <span className="text-[11px] text-on-surface-variant mt-0.5">
                {profile.shiftDays}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 text-secondary flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant font-medium">
                Jam Fleksibel
              </span>
              <span className="font-bold text-on-surface mt-0.5">
                Toleransi {profile.flexibleToleranceMinutes} Menit (Diizinkan)
              </span>
              <span className="text-[11px] text-on-surface-variant mt-0.5">
                Kompensasi pulang otomatis di akhir jam operasional
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Perangkat & Keamanan GPS Terdaftar */}
      <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-card border border-structural-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">
              Perangkat & Keamanan GPS Terdaftar
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-container text-tertiary-container flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Hardware Bound</span>
          </span>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {/* Device Card */}
          <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high text-primary flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-on-surface">
                  {profile.registeredDevice}
                </span>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  {profile.deviceImei}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-surface-container-highest text-primary font-mono text-[10px] font-bold rounded-lg">
              TERVERIFIKASI
            </span>
          </div>

          {/* Biometric Toggle Switch */}
          <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-on-surface">
                Biometric Authentication
              </span>
              <span className="text-[11px] text-on-surface-variant mt-0.5">
                Face ID & Fingerprint Aktif untuk check-in
              </span>
            </div>
            <button
              onClick={onToggleBiometric}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                profile.biometricActive ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  profile.biometricActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {/* Fake GPS Detection */}
          <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-on-surface">Fake GPS Detection</span>
              <span className="text-[11px] text-on-surface-variant mt-0.5">
                Sistem Anti-Mock Aktif & Root Shielding v4.2
              </span>
            </div>
            <span className="px-2.5 py-1 bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[10px] rounded-full">
              SHIELD ON
            </span>
          </div>
        </div>
      </div>

      {/* Pengaturan Akun & Bantuan */}
      <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-card border border-structural-border flex flex-col gap-2">
        <h3 className="text-sm font-bold text-on-surface px-1 mb-1">
          Pengaturan Akun & Bantuan
        </h3>

        <button
          onClick={() =>
            onShowNotice(
              'Ganti Kata Sandi & PIN',
              'Silakan hubungi administrator IT Security untuk mereset kunci RSA presensi.'
            )
          }
          className="p-3 rounded-2xl hover:bg-surface-container-low flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-on-surface">
                Ganti Kata Sandi & PIN Absensi
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Update kredensial verifikasi login berkala
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() =>
            onShowNotice(
              'Pengaturan Notifikasi',
              'Pengingat jam masuk 15 menit sebelum toleransi geofence telah aktif secara default.'
            )
          }
          className="p-3 rounded-2xl hover:bg-surface-container-low flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-primary flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-on-surface">
                Pengaturan Notifikasi & Pengingat
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Alert jam masuk 15 menit sebelum geofence close
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() =>
            onShowNotice(
              'Bantuan & FAQ Magang',
              'Jika GPS gagal mendeteksi sinyal di dalam gedung bertingkat, harap mendekat ke jendela atau hubungi HRD.'
            )
          }
          className="p-3 rounded-2xl hover:bg-surface-container-low flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-on-surface">
                Bantuan & FAQ Absensi PKL / Magang
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Panduan sinyal lemah, log offline, & perizinan
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Logout button */}
      <div className="pt-2">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs tracking-wide border border-red-200 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Akun (Logout)</span>
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-structural-border max-w-sm w-full text-center">
            <LogOut className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-on-surface">
              Konfirmasi Keluar Akun?
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Data sesi Anda akan dinonaktifkan di perangkat ini. Anda harus masuk kembali dengan kredensial SSO GeoPulse.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="py-2.5 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-on-surface-variant flex flex-col gap-0.5 pt-2">
        <span className="font-mono">GeoPulse Enterprise Suite • v3.8.4-build.921</span>
        <span>Dilindungi enkripsi end-to-end telemetry PT GeoPulse Digital</span>
      </div>
    </div>
  );
};
