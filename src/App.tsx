import React, { useState, useEffect } from 'react';
import {
  PageId,
  AttendanceStatus,
  EmployeeProfile,
  AttendanceRecord,
} from './types/attendance';
import { INITIAL_EMPLOYEE_PROFILE } from './data/mockData';
import { DesktopTitleBar } from './components/DesktopTitleBar';
import { SidebarNav } from './components/SidebarNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SelfServiceModal, ServiceModalType } from './components/SelfServiceModal';
import { LocationDetailModal } from './components/LocationDetailModal';
import { Toast, ToastMessage } from './components/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { VerifyGpsPage } from './pages/VerifyGpsPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { Radio } from 'lucide-react';
import {
  getAttendanceHistory,
  submitAttendance,
  type AttendanceDB,
  type AttendanceLocationPayload,
  type VerifiedAttendanceDB,
} from './services/attendanceService';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

const ATTENDANCE_TIME_ZONE = 'Asia/Jakarta';

function formatAttendanceTime(timestamp: string): string {
  return `${new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ATTENDANCE_TIME_ZONE,
  })} WIB`;
}

function formatAttendanceDate(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: ATTENDANCE_TIME_ZONE,
  });
}

function getAttendanceDateToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toAttendanceRecords(rows: AttendanceDB[]): AttendanceRecord[] {
  const grouped = new Map<string, {
    record: AttendanceRecord;
    checkInTimestamp?: number;
    checkOutTimestamp?: number;
  }>();

  rows.forEach((row) => {
    let group = grouped.get(row.attendance_date);
    if (!group) {
      group = {
        record: {
          id: row.id,
          date: row.attendance_date,
          dateFormatted: formatAttendanceDate(row.attendance_date),
          shift: 'Shift Reguler',
          shiftHours: '08:30 - 17:00',
          status: 'wfo',
          statusLabel: 'Hadir Tercatat',
          statusColor: 'blue',
        },
      };
      grouped.set(row.attendance_date, group);
    }

    const time = formatAttendanceTime(row.checked_at);
    const location =
      row.latitude !== null && row.longitude !== null
        ? `GPS ${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}`
        : 'GPS tidak tersedia';

    if (row.type === 'check_in') {
      group.record.id = row.id;
      group.record.checkIn = time;
      group.record.checkInLocation = location;
      group.checkInTimestamp = new Date(row.checked_at).getTime();
      if (row.latitude !== null && row.longitude !== null) {
        group.record.coordinates = {
          lat: row.latitude,
          lng: row.longitude,
          distanceMeters: row.distance_to_office_m,
          accuracyMeters: row.gps_accuracy_m ?? undefined,
        };
      }
      if (row.photo_url) group.record.checkInPhotoUrl = row.photo_url;
    } else {
      group.record.checkOut = time;
      group.record.checkOutLocation = location;
      group.checkOutTimestamp = new Date(row.checked_at).getTime();
      if (row.photo_url) group.record.checkOutPhotoUrl = row.photo_url;
    }
  });

  return [...grouped.values()]
    .map(({ record, checkInTimestamp, checkOutTimestamp }) => {
      if (checkInTimestamp !== undefined && checkOutTimestamp !== undefined) {
        const durationMinutes = Math.max(0, Math.floor((checkOutTimestamp - checkInTimestamp) / 60000));
        record.duration = `${Math.floor(durationMinutes / 60)} Jam ${durationMinutes % 60} Mnt`;
      } else if (checkInTimestamp !== undefined) {
        record.duration = 'Berjalan';
      }
      return record;
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => window.innerWidth < 768);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>(() =>
    window.innerWidth < 768 ? 'mobile' : 'desktop'
  );
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('not_clocked_in');
  const [attendanceDataReady, setAttendanceDataReady] = useState(false);
  const [attendanceLoadError, setAttendanceLoadError] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile>(INITIAL_EMPLOYEE_PROFILE);

  const [attendanceType, setAttendanceType] = useState<'masuk' | 'pulang'>('masuk');

  const [serviceModalType, setServiceModalType] = useState<ServiceModalType>(null);
  const [locationRecord, setLocationRecord] = useState<AttendanceRecord | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
      setIsAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateViewportMode = () => {
      const isCompact = window.innerWidth < 768;
      setIsCompactViewport(isCompact);
      if (isCompact) setViewportMode('mobile');
    };
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  useEffect(() => {
    let active = true;
    setAttendanceDataReady(false);
    setAttendanceLoadError(null);

    if (!authSession) {
      setRecords([]);
      setAttendanceStatus('not_clocked_in');
      setCheckInTime(null);
      setCheckOutTime(null);
      setCurrentPage('dashboard');
      return () => {
        active = false;
      };
    }

    void getAttendanceHistory()
      .then((rows) => {
        if (!active) return;
        const history = toAttendanceRecords(rows);
        const today = getAttendanceDateToday();
        const todayRows = rows.filter((row) => row.attendance_date === today);
        const checkedIn = todayRows.some((row) => row.type === 'check_in');
        const checkedOut = todayRows.some((row) => row.type === 'check_out');
        const todayRecord = history.find((record) => record.date === today);

        setRecords(history);
        setAttendanceStatus(
          checkedOut ? 'clocked_out' : checkedIn ? 'clocked_in' : 'not_clocked_in'
        );
        setCheckInTime(todayRecord?.checkIn ?? null);
        setCheckOutTime(todayRecord?.checkOut ?? null);
        setAttendanceDataReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRecords([]);
        setAttendanceStatus('not_clocked_in');
        setCheckInTime(null);
        setCheckOutTime(null);
        setAttendanceLoadError(
          error instanceof Error ? error.message : 'Riwayat absensi gagal dimuat.'
        );
      });

    return () => {
      active = false;
    };
  }, [authSession]);

  const showToast = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ id: Date.now().toString(), title, message, type });
    // Also trigger desktop OS notification if available
    if (window.electronAPI) {
      window.electronAPI.showNotification(title, message);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const handleRequestAttendance = (type: 'masuk' | 'pulang') => {
    if (!attendanceDataReady) {
      showToast(
        'Status Absensi Belum Tersedia',
        attendanceLoadError ?? 'Sedang memuat status absensi. Coba lagi sebentar.',
        'warning'
      );
      return;
    }
    setAttendanceType(type);
    setCurrentPage('verification-gps');
  };

  const handleAttendance = async (
    type: 'masuk' | 'pulang',
    location: AttendanceLocationPayload,
    photo: Blob
  ): Promise<VerifiedAttendanceDB> => {
    const attendance = await submitAttendance(
      type === 'masuk' ? 'check-in' : 'check-out',
      location,
      photo
    );
    const checkedAt = new Date(attendance.checked_at);
    if (!Number.isFinite(checkedAt.getTime())) {
      throw new Error('Server mengembalikan waktu absensi yang tidak valid.');
    }

    const timeStr = formatAttendanceTime(attendance.checked_at);
    const dateFormatted = formatAttendanceDate(attendance.attendance_date);

    if (type === 'masuk') {
      setAttendanceStatus('clocked_in');
      setCheckInTime(timeStr);
      const newRecord: AttendanceRecord = {
        id: attendance.id,
        date: attendance.attendance_date,
        dateFormatted,
        shift: 'Shift Reguler',
        shiftHours: '08:30 - 17:00',
        checkIn: timeStr,
        checkInLocation: `GPS ${attendance.latitude.toFixed(6)}, ${attendance.longitude.toFixed(6)}`,
        duration: 'Berjalan',
        status: 'wfo',
        statusLabel: 'Hadir Tercatat',
        statusColor: 'blue',
        coordinates: {
          lat: attendance.latitude,
          lng: attendance.longitude,
          distanceMeters: attendance.distance_to_office_m,
          accuracyMeters: attendance.gps_accuracy_m,
        },
      };
      setRecords((current) => [newRecord, ...current]);
      showToast('Check-In Disetujui', `Presensi masuk tercatat pada ${timeStr}.`);
    } else {
      setAttendanceStatus('clocked_out');
      setCheckOutTime(timeStr);
      setRecords((current) =>
        current.map((record) =>
          record.date === attendance.attendance_date
            ? {
                ...record,
                checkOut: timeStr,
                checkOutLocation: `GPS ${attendance.latitude.toFixed(6)}, ${attendance.longitude.toFixed(6)}`,
              }
            : record
        )
      );
      showToast('Check-Out Disetujui', `Presensi pulang tercatat pada ${timeStr}.`);
    }

    return attendance;
  };

  // CSV Report export
  const handleExportReport = async () => {
    const headers = 'ID,Tanggal,Shift,Jam Masuk,Jam Pulang,Lokasi,Durasi,Status\n';
    const rows = records
      .map(
        (r) =>
          `"${r.id}","${r.dateFormatted}","${r.shift}","${r.checkIn || '-'}","${
            r.checkOut || '-'
          }","${r.checkInLocation || '-'}","${r.duration || '-'}","${r.statusLabel}"`
      )
      .join('\n');
    const csvContent = headers + rows;

    if (window.electronAPI) {
      const res = await window.electronAPI.exportReport(
        csvContent,
        `Rekap_Absensi_GeoPulse_${new Date().toISOString().slice(0, 10)}.csv`
      );
      if (res.success) {
        showToast('Laporan Diekspor', `File tersimpan di: ${res.filePath}`);
      } else if (res.error !== 'Dibatalkan oleh pengguna') {
        showToast('Gagal Menyimpan', res.error || 'Terjadi kesalahan', 'warning');
      }
    } else {
      // Browser fallback
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rekap_Absensi_GeoPulse_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Laporan Diunduh', 'File CSV berhasil diunduh ke komputer Anda.');
    }
  };

  // Profile toggles
  const handleToggleBiometric = () => {
    setProfile((prev) => ({
      ...prev,
      biometricActive: !prev.biometricActive,
    }));
    showToast(
      'Pengaturan Diperbarui',
      `Otentikasi biometrik ${!profile.biometricActive ? 'Diaktifkan' : 'Dinonaktifkan'}.`,
      'info'
    );
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast('Gagal Keluar', error.message, 'warning');
    }
  };

  if (!isAuthReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fbf8ff] px-4 text-sm text-on-surface-variant">
        Memeriksa sesi login...
      </main>
    );
  }

  if (!authSession) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-[100dvh] w-screen flex-col bg-[#fbf8ff] text-on-surface select-none overflow-hidden">
      {/* 1. Desktop Frameless Window TitleBar */}
      {!isCompactViewport && (
        <DesktopTitleBar
          viewportMode={viewportMode}
          setViewportMode={setViewportMode}
        />
      )}

      {/* 2. Main Window Shell */}
      {viewportMode === 'desktop' ? (
        /* DESKTOP COMMAND CENTER LAYOUT */
        <div className="flex flex-1 overflow-hidden">
          {/* 260px Left Navigation Sidebar */}
          <SidebarNav
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            profile={profile}
            attendanceStatus={attendanceStatus}
          />

          {/* Right Main Content Viewport */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#fbf8ff]">
            {currentPage === 'dashboard' && (
              <DashboardPage
                profile={profile}
                attendanceStatus={attendanceStatus}
                checkInTime={checkInTime}
                checkOutTime={checkOutTime}
                recentRecords={records}
                onOpenBiometric={handleRequestAttendance}
                onOpenServiceModal={(type) => setServiceModalType(type)}
                onNavigate={setCurrentPage}
              />
            )}

            {currentPage === 'verification-gps' && (
              <VerifyGpsPage
                onConfirmAttendance={handleAttendance}
                attendanceType={attendanceType}
                canSubmit={
                  attendanceDataReady && (attendanceType === 'masuk'
                    ? attendanceStatus === 'not_clocked_in'
                    : attendanceStatus === 'clocked_in')
                }
                attendanceUnavailableReason={
                  attendanceDataReady
                    ? null
                    : attendanceLoadError ?? 'Memeriksa status absensi...'
                }
              />
            )}

            {currentPage === 'attendance-history' && (
              <HistoryPage
                records={records}
                isLoading={!attendanceDataReady && !attendanceLoadError && !!authSession}
                loadError={attendanceLoadError}
                onOpenMapDetail={(rec) => setLocationRecord(rec)}
                onExportReport={handleExportReport}
              />
            )}

            {currentPage === 'employee-profile' && (
              <ProfilePage
                profile={profile}
                onToggleBiometric={handleToggleBiometric}
                onLogout={handleLogout}
                onShowNotice={(title, msg) => showToast(title, msg, 'info')}
              />
            )}
          </main>
        </div>
      ) : (
        /* MOBILE VIEWPORT CONTAINER (Exact replication of screen.png mobile preview) */
        <div className="flex-1 flex justify-center items-center bg-[#1e2238] p-2 sm:p-4 overflow-hidden">
          <div className="relative w-full max-w-md h-full max-h-[860px] bg-surface rounded-[36px] shadow-2xl border-4 border-[#2b3050] overflow-hidden flex flex-col">
            {/* Mobile Top Header */}
            <header className="h-16 px-4 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-structural-border flex items-center justify-between shrink-0 z-30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Radio className="w-4 h-4 text-tertiary-fixed" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-on-surface leading-tight">
                    GeoPulse
                  </span>
                  <span className="text-[10px] text-on-surface-variant capitalize">
                    {currentPage.replace('-', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping"></span>
                  <span className="font-mono text-[10px] text-on-surface font-semibold">
                    GPS CHECK
                  </span>
                </div>
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
                />
              </div>
            </header>

            {/* Scrollable Mobile Page Body */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
              {currentPage === 'dashboard' && (
                <DashboardPage
                  profile={profile}
                  attendanceStatus={attendanceStatus}
                  checkInTime={checkInTime}
                  checkOutTime={checkOutTime}
                  recentRecords={records}
                  onOpenBiometric={handleRequestAttendance}
                  onOpenServiceModal={(type) => setServiceModalType(type)}
                  onNavigate={setCurrentPage}
                />
              )}

              {currentPage === 'verification-gps' && (
                <VerifyGpsPage
                  onConfirmAttendance={handleAttendance}
                  attendanceType={attendanceType}
                  canSubmit={
                    attendanceDataReady && (attendanceType === 'masuk'
                      ? attendanceStatus === 'not_clocked_in'
                      : attendanceStatus === 'clocked_in')
                  }
                  attendanceUnavailableReason={
                    attendanceDataReady
                      ? null
                      : attendanceLoadError ?? 'Memeriksa status absensi...'
                  }
                />
              )}

              {currentPage === 'attendance-history' && (
                <HistoryPage
                  records={records}
                  isLoading={!attendanceDataReady && !attendanceLoadError && !!authSession}
                  loadError={attendanceLoadError}
                  onOpenMapDetail={(rec) => setLocationRecord(rec)}
                  onExportReport={handleExportReport}
                />
              )}

              {currentPage === 'employee-profile' && (
                <ProfilePage
                  profile={profile}
                  onToggleBiometric={handleToggleBiometric}
                  onLogout={handleLogout}
                  onShowNotice={(title, msg) => showToast(title, msg, 'info')}
                />
              )}
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <MobileBottomNav
              currentPage={currentPage}
              onNavigate={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* 3. Global Interactive Modals */}
      <SelfServiceModal
        type={serviceModalType}
        onClose={() => setServiceModalType(null)}
        onSubmitSuccess={(msg) => showToast('Permohonan Terkirim', msg)}
      />

      <LocationDetailModal
        record={locationRecord}
        onClose={() => setLocationRecord(null)}
      />

      {/* 4. Global Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
