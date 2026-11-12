import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Monitor, Smartphone, ShieldCheck } from 'lucide-react';

interface DesktopTitleBarProps {
  viewportMode: 'desktop' | 'mobile';
  setViewportMode: (mode: 'desktop' | 'mobile') => void;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  viewportMode,
  setViewportMode,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
      const max = await window.electronAPI.isMaximized();
      setIsMaximized(max);
    } else {
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  return (
    <div className="h-10 bg-[#1e2238] text-white flex items-center justify-between px-3 select-none app-drag-region border-b border-[#2d3252] z-50 text-xs">
      {/* Left: App Branding & Status */}
      <div className="flex items-center gap-2.5 app-no-drag">
        {/* Brand Icon */}
        <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed animate-pulse"></div>
        </div>
        <div className="flex items-center gap-1.5 font-medium tracking-tight">
          <span className="font-bold text-white text-[13px]">GeoPulse</span>
          <span className="text-[#8e93b2] text-[11px] hidden sm:inline">Enterprise Desktop</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#2a3050] text-[#9acbff] font-mono">v3.8.4</span>
        </div>

        {/* Telemetry Radar Badge */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#252a46] px-2 py-0.5 rounded-full border border-[#353c63]">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9acbff]"></span>
          </span>
          <span className="font-mono text-[10px] text-[#dee0ff] font-medium tracking-wide">
            GPS DICEK SAAT VERIFIKASI
          </span>
        </div>
      </div>

      {/* Center: Real-time Synchronized Digital Telemetry Clock & Mode Switcher */}
      <div className="flex items-center gap-3 app-no-drag">
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-[#bdc2ff] bg-[#252a46] px-2.5 py-0.5 rounded-md border border-[#353c63]">
          <ShieldCheck className="w-3.5 h-3.5 text-tertiary-fixed" />
          <span>GPS DIBACA DI HALAMAN VERIFIKASI</span>
          <span className="text-[#656d98]">•</span>
          <span className="text-white font-semibold">{timeStr || '08:42:18 WIB'}</span>
        </div>

        {/* Viewport Mode Switcher */}
        <div className="flex items-center bg-[#252a46] p-0.5 rounded-lg border border-[#353c63]">
          <button
            onClick={() => setViewportMode('desktop')}
            title="Tampilan Desktop Multi-Pane"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              viewportMode === 'desktop'
                ? 'bg-primary text-white shadow-sm font-semibold'
                : 'text-[#8e93b2] hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setViewportMode('mobile')}
            title="Tampilan Mobile Mockup (Asli)"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              viewportMode === 'mobile'
                ? 'bg-primary text-white shadow-sm font-semibold'
                : 'text-[#8e93b2] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile Mockup</span>
          </button>
        </div>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center app-no-drag">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center text-[#9ca1bf] hover:text-white hover:bg-[#2b3152] transition-colors rounded"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center text-[#9ca1bf] hover:text-white hover:bg-[#2b3152] transition-colors rounded"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-[#9ca1bf] hover:text-white hover:bg-[#e02424] transition-colors rounded"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
