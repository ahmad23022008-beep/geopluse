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
  submitAttendance,
  type AttendanceLocationPayload,
  type VerifiedAttendanceDB,
} from './services/attendanceService';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('not_clocked_in');
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile>(INITIAL_EMPLOYEE_PROFILE);

  const [attendanceType, setAttendanceType] = useState<'masuk' | 'pulang'>('masuk');

  const [serviceModalType, setServiceModalType] = useState<ServiceModalType>(null);
  const [locationRecord, setLocationRecord] = useState<AttendanceRecord | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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

    const timeStr = `${checkedAt.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    })} WIB`;
    const dateFormatted = checkedAt.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });

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
        checkInLocation: `Radius ${Math.round(attendance.distance_to_office_m ?? 0)}m`,
        duration: 'Berjalan',
        status: 'tepat_waktu',
        statusLabel: 'Hadir Tercatat',
        statusColor: 'lime',
        coordinates: {
          lat: attendance.latitude,
          lng: attendance.longitude,
          distanceMeters: attendance.distance_to_office_m,
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
                checkOutLocation: `Radius ${Math.round(attendance.distance_to_office_m)}m`,
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

  const handleLogout = () => {
    setAttendanceStatus('not_clocked_in');
    setCheckInTime(null);
    setCheckOutTime(null);
    setCurrentPage('dashboard');
    showToast('Sesi Berakhir', 'Anda telah keluar dari akun.', 'info');
  };

  // Kalau belum login → tampilkan halaman login
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fbf8ff] text-on-surface select-none overflow-hidden">
      {/* 1. Desktop Frameless Window TitleBar */}
      <DesktopTitleBar
        viewportMode={viewportMode}
        setViewportMode={setViewportMode}
      />

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
                  attendanceType === 'masuk'
                    ? attendanceStatus === 'not_clocked_in'
                    : attendanceStatus === 'clocked_in'
                }
              />
            )}

            {currentPage === 'attendance-history' && (
              <HistoryPage
                records={records}
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
                    attendanceType === 'masuk'
                      ? attendanceStatus === 'not_clocked_in'
                      : attendanceStatus === 'clocked_in'
                  }
                />
              )}

              {currentPage === 'attendance-history' && (
                <HistoryPage
                  records={records}
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
