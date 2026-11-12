export type PageId = 'dashboard' | 'verification-gps' | 'attendance-history' | 'employee-profile';

export type DiagnosticState = 'verified' | 'out_of_bounds' | 'weak_gps' | 'permission_denied';

export type AttendanceStatus = 'not_clocked_in' | 'clocked_in' | 'clocked_out';

export interface AttendanceRecord {
  id: string;
  date: string;
  dateFormatted: string;
  shift: string;
  shiftHours: string;
  checkIn?: string;
  checkOut?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  duration?: string;
  status: 'tepat_waktu' | 'terlambat' | 'izin_sakit' | 'wfo' | 'alpha';
  statusLabel: string;
  statusColor: 'lime' | 'blue' | 'yellow' | 'red';
  delayMinutes?: number;
  attachment?: {
    name: string;
    size: string;
    doctor?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
    distanceMeters: number;
  };
}

export interface EmployeeProfile {
  name: string;
  degree: string;
  employeeId: string;
  division: string;
  avatar: string;
  status: string;
  assignedLocation: string;
  geofenceRadiusMeters: number;
  shiftDefault: string;
  shiftDays: string;
  flexibleToleranceMinutes: number;
  registeredDevice: string;
  deviceImei: string;
  biometricActive: boolean;
  mockGpsShield: boolean;
  lastSyncTime: string;
  attendanceScore: number;
  avgCheckInTime: string;
  leaveBalanceDays: number;
}

export interface DiagnosticConfig {
  id: DiagnosticState;
  title: string;
  statusBadge: string;
  badgeType: 'lime' | 'red' | 'yellow' | 'neutral';
  statusTitle: string;
  statusSubtitle: string;
  userDistanceMeters: number;
  accuracyMeters: number;
  satellites: number;
  isMockSafe: boolean;
  canProceed: boolean;
  pinCoordinates: { x: number; y: number }; // percentage inside radar circle
  description: string;
}

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isMaximized: () => Promise<boolean>;
      getAppVersion: () => Promise<string>;
      showNotification: (title: string, body: string) => void;
      exportReport: (data: string, filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    };
  }
}
