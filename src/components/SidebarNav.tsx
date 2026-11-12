import React from 'react';
import { PageId, AttendanceStatus, EmployeeProfile } from '../types/attendance';
import { LayoutGrid, MapPin, History, UserCheck, Shield, Radio, CheckCircle2 } from 'lucide-react';

interface SidebarNavProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  profile: EmployeeProfile;
  attendanceStatus: AttendanceStatus;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentPage,
  onNavigate,
  profile,
  attendanceStatus,
}) => {
  const navItems = [
    {
      id: 'dashboard' as PageId,
      label: 'Dashboard Kehadiran',
      shortLabel: 'Dashboard',
      icon: LayoutGrid,
      badge: attendanceStatus === 'clocked_in' ? 'Hadir' : undefined,
      badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed',
    },
    {
      id: 'verification-gps' as PageId,
      label: 'Verifikasi GPS & Geofence',
      shortLabel: 'Verify GPS',
      icon: MapPin,
      badge: 'Live',
      badgeColor: 'bg-secondary-fixed text-on-secondary-fixed',
    },
    {
      id: 'attendance-history' as PageId,
      label: 'Riwayat & Log Kehadiran',
      shortLabel: 'History',
      icon: History,
      badge: '24 Log',
      badgeColor: 'bg-[#2b3050] text-[#dee0ff]',
    },
    {
      id: 'employee-profile' as PageId,
      label: 'Profil & Keamanan',
      shortLabel: 'Profile',
      icon: UserCheck,
      badge: 'Aktif',
      badgeColor: 'bg-tertiary-fixed/30 text-tertiary-container',
    },
  ];

  return (
    <aside className="w-64 bg-[#161a33] text-white flex flex-col justify-between shrink-0 border-r border-[#2b2f49] select-none h-full">
      {/* Top: Brand & User profile snippet */}
      <div className="p-4 flex flex-col gap-4">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-md shadow-primary/20">
            <Radio className="w-5 h-5 text-tertiary-fixed animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[16px] text-white leading-tight tracking-tight flex items-center gap-1.5">
              GeoPulse
              <span className="px-1.5 py-0.2 text-[9px] bg-tertiary-fixed text-on-tertiary-fixed font-bold rounded">
                ENTERPRISE
              </span>
            </span>
            <span className="text-[11px] text-[#9ca1bf] font-medium leading-snug">
              Workforce Geofence OS
            </span>
          </div>
        </div>

        {/* User Mini Card */}
        <div className="bg-[#212644] rounded-xl p-3 border border-[#31375c] flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/40"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-tertiary-fixed rounded-full ring-2 ring-[#212644] flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-[#191e00]" />
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-[13px] text-white truncate leading-tight">
              {profile.name}
            </span>
            <span className="text-[11px] text-[#9ca1bf] truncate">
              {profile.division}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/20 text-[#bdc2ff] font-mono">
                {profile.employeeId}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"></span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 mt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#73789b] px-3 mb-1">
            Menu Navigasi
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/30 font-semibold'
                    : 'text-[#bdc2ff] hover:bg-[#212644] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-tertiary-fixed' : 'text-[#8e93b2]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Geofence Telemetry Health status box */}
      <div className="p-4 border-t border-[#2b2f49] bg-[#1a1f3d]">
        <div className="bg-[#242a4d] rounded-xl p-3 border border-[#353c69] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-tertiary-fixed text-[11px] font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>GEOFENCE ENCRYPTED</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping"></span>
          </div>
          <div className="flex flex-col text-[11px] text-[#9ca1bf] gap-0.5">
            <span className="text-white font-medium">JKT-HQ-01 (Menara Mandiri)</span>
            <span className="font-mono text-[10px] text-[#bdc2ff]">Radius: 50m • Accuracy: ±3.8m</span>
          </div>
          <div className="pt-1 border-t border-[#31375c] flex items-center justify-between text-[10px]">
            <span className="text-[#8e93b2]">Status Presensi:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                attendanceStatus === 'clocked_in'
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-[#31375c] text-white'
              }`}
            >
              {attendanceStatus === 'clocked_in' ? 'Aktif (Check-In)' : 'Belum Check-In'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
