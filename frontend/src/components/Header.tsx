import React, { useState, useEffect, useRef } from 'react';
import { Shield, Clock, AlertCircle, User, FolderLock, FileText, Command, Volume2, VolumeX, Cpu } from 'lucide-react';

interface HeaderProps {
  status: string;
  getStatusColor?: (status: string) => string;
  wsConnected?: boolean;
  activeWifiZones?: number;
  sosMode?: boolean;
  onToggleSos?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenLocker?: () => void;
  onOpenReport?: () => void;
  onOpenPalette?: () => void;
  onOpenHardware?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  wsConnected = true,
  sosMode = false,
  onToggleSos,
  soundEnabled = true,
  onToggleSound,
  onOpenLocker,
  onOpenReport,
  onOpenPalette,
  onOpenHardware,
}) => {
  const [time, setTime] = useState(new Date());
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNominal = status === 'SAFE' || status === 'NOMINAL' || !status;
  const isCritical = status === 'CRITICAL' || status === 'EVACUATE' || sosMode;

  return (
    <header className="glass-header sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
      {/* ── 1. CrowdPulse Logo ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#1C1C21] border border-white/[0.06] flex items-center justify-center text-white">
          <Shield size={16} strokeWidth={1.75} className="text-[#00B5FF]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-white font-sans">
            CrowdPulse
          </span>
          <span className="text-[11px] font-medium text-[#B9B9C5] bg-[#1C1C21] px-2 py-0.5 rounded-full border border-white/[0.04]">
            Enterprise
          </span>
        </div>
      </div>

      {/* ── 2. Center: System Status, Connection Status & Clock ── */}
      <div className="hidden md:flex items-center gap-4 bg-[#141417] px-4 py-1.5 rounded-full border border-white/[0.05] text-xs">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5 font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-[#1ED760]' : 'bg-[#F5A524] animate-pulse'
            }`}
          />
          <span className="text-[#B9B9C5]">
            {wsConnected ? 'Connected' : 'Connecting'}
          </span>
        </div>

        <span className="w-px h-3 bg-white/[0.08]" />

        {/* System Status */}
        <div className="flex items-center gap-1.5 font-medium">
          <span
            className={`text-xs ${
              isCritical
                ? 'text-[#FF4D5A]'
                : isNominal
                ? 'text-[#1ED760]'
                : 'text-[#F5A524]'
            }`}
          >
            System {sosMode ? 'Evacuation' : isNominal ? 'Normal' : status}
          </span>
        </div>

        <span className="w-px h-3 bg-white/[0.08]" />

        {/* Clock */}
        <div className="flex items-center gap-1.5 text-[#B9B9C5] font-medium">
          <Clock size={12} strokeWidth={1.75} />
          <span>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ── 3. Right: Emergency Button & Profile ── */}
      <div className="flex items-center gap-3">
        {/* ESP32 Hardware Connect Button */}
        {onOpenHardware && (
          <button
            onClick={onOpenHardware}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Connect ESP32 / Arduino Hardware Node (COM4)"
          >
            <Cpu size={13} strokeWidth={2} className="text-cyan-400" />
            <span>Connect ESP32</span>
          </button>
        )}

        {/* Emergency Button */}
        {onToggleSos && (
          <button
            onClick={onToggleSos}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              sosMode
                ? 'bg-[#FF4D5A] text-white shadow-lg'
                : 'bg-[#FF4D5A]/10 text-[#FF4D5A] border border-[#FF4D5A]/25 hover:bg-[#FF4D5A]/15'
            }`}
          >
            <AlertCircle size={13} strokeWidth={2} />
            <span>{sosMode ? 'Cancel SOS' : 'Emergency'}</span>
          </button>
        )}

        {/* Profile / Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full bg-[#1C1C21] border border-white/[0.06] hover:border-white/[0.15] flex items-center justify-center text-[#B9B9C5] hover:text-white transition-all"
            title="Profile & Workspace Utilities"
          >
            <User size={15} strokeWidth={1.75} />
          </button>

          {/* Clean Apple-style dropdown menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 card-apple p-1.5 z-50 flex flex-col gap-0.5 shadow-2xl">
              <div className="px-3 py-2 border-b border-white/[0.05] mb-1">
                <p className="text-xs font-semibold text-white">Operations Chief</p>
                <p className="text-[11px] text-[#B9B9C5]">Security Command Center</p>
              </div>

              {onOpenPalette && (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenPalette();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs text-[#B9B9C5] hover:text-white hover:bg-white/[0.05] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Command size={13} strokeWidth={1.75} />
                    <span>Command Palette</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘K</span>
                </button>
              )}

              {onOpenLocker && (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenLocker();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs text-[#B9B9C5] hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                >
                  <FolderLock size={13} strokeWidth={1.75} />
                  <span>Evidence Vault</span>
                </button>
              )}

              {onOpenReport && (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenReport();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs text-[#B9B9C5] hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                >
                  <FileText size={13} strokeWidth={1.75} />
                  <span>Forensic Audit Dossier</span>
                </button>
              )}

              {onToggleSound && (
                <button
                  onClick={() => {
                    onToggleSound();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs text-[#B9B9C5] hover:text-white hover:bg-white/[0.05] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 size={13} strokeWidth={1.75} />
                    ) : (
                      <VolumeX size={13} strokeWidth={1.75} />
                    )}
                    <span>Alert Audio</span>
                  </div>
                  <span className="text-[10px] text-[#B9B9C5]">
                    {soundEnabled ? 'On' : 'Muted'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
