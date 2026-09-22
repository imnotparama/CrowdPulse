import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Clock, Signal, Siren, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  status: string;
  getStatusColor: (status: string) => string;
  wsConnected?: boolean;
  activeWifiZones?: number;
  sosMode?: boolean;
  onToggleSos?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  getStatusColor,
  wsConnected = true,
  activeWifiZones = 0,
  sosMode = false,
  onToggleSos,
  soundEnabled = true,
  onToggleSound,
}) => {
  const [time, setTime] = useState(new Date());
  const [cpuUsage, setCpuUsage] = useState(16);
  const [netLatency, setNetLatency] = useState(24);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setCpuUsage((prev) => Math.max(8, Math.min(35, prev + (Math.random() - 0.5) * 4)));
      setNetLatency((prev) => Math.max(16, Math.min(42, prev + (Math.random() - 0.5) * 4)));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="glass-header sticky top-0 z-40 px-5 h-14 flex items-center justify-between">
      {/* ── Left: Logo & Platform Identity ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(255,23,68,0.2)]">
          <Activity size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold font-['Space_Grotesk'] text-white tracking-tight">
              Crowd<span className="text-red-500">Pulse</span>
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/25 shadow-[0_0_10px_rgba(0,224,255,0.15)]">
              ENTERPRISE v4.0
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI INFERENCE ENGINE
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-sans hidden sm:block">
            Autonomous Crowd Intelligence & Edge Surveillance System
          </p>
        </div>
      </div>

      {/* ── Center: Active Telemetry Pill ── */}
      <div className="hidden lg:flex items-center gap-3 bg-white/[0.03] px-3.5 py-1 rounded-full border border-white/[0.06] text-xs font-mono">
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {wsConnected ? 'ONLINE' : 'RECONNECTING'}
        </span>
        <span className="text-zinc-600">|</span>
        <span className={`font-semibold ${getStatusColor(status)}`}>
          SYS {status}
        </span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-400">5 FEEDS</span>
        {activeWifiZones > 0 && (
          <>
            <span className="text-zinc-600">|</span>
            <span className="text-cyan-400">{activeWifiZones} SENSORS</span>
          </>
        )}
      </div>

      {/* ── Right: System Vitals & Actions ── */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Latency & CPU */}
        <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5 bg-white/[0.02] px-2.5 py-1 rounded-md border border-white/[0.04]">
            <Cpu size={12} className="text-zinc-400" />
            <span>CPU {Math.round(cpuUsage)}%</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/[0.02] px-2.5 py-1 rounded-md border border-white/[0.04]">
            <Signal size={12} className="text-emerald-400" />
            <span>{Math.round(netLatency)}ms</span>
          </div>
        </div>

        {/* Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-zinc-400">
          <Clock size={12} className="text-zinc-500" />
          <span>{time.toLocaleTimeString()}</span>
        </div>

        {/* Audio Toggle */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className="btn-icon-soc"
            title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        )}

        {/* SOS Emergency Button */}
        {onToggleSos && (
          <button
            onClick={onToggleSos}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all ${
              sosMode
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(255,23,68,0.6)] animate-pulse'
                : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            <Siren size={13} />
            <span>{sosMode ? 'CANCEL SOS' : 'EMERGENCY SOS'}</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
