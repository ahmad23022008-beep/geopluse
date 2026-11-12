import React from 'react';
import { PageId } from '../types/attendance';

interface MobileBottomNavProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPage,
  onNavigate,
}) => {
  const tabs = [
    {
      id: 'dashboard' as PageId,
      label: 'Dashboard',
      icon: 'grid_view',
    },
    {
      id: 'verification-gps' as PageId,
      label: 'Verify GPS',
      icon: 'location_on',
      hasDot: true,
    },
    {
      id: 'attendance-history' as PageId,
      label: 'History',
      icon: 'schedule',
    },
    {
      id: 'employee-profile' as PageId,
      label: 'Profile',
      icon: 'person',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(37,41,67,0.06)] border-t border-structural-border select-none">
      <div className="h-16 max-w-lg mx-auto px-4 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`min-w-[54px] min-h-[50px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
                  ? 'text-primary-container font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">
                  {tab.icon}
                </span>
                {tab.hasDot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-tertiary-fixed ring-1 ring-white"></span>
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
