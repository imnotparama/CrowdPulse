import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Radio, Wifi, Clock, Signal } from 'lucide-react';

interface HeaderProps {
    status: string;
    getStatusColor: (status: string) => string;
    wsConnected?: boolean;
    activeWifiZones?: number;
}

const Header: React.FC<HeaderProps> = ({ status, getStatusColor, wsConnected = true, activeWifiZones = 0 }) => {
    const [time, setTime] = useState(new Date());
    const [cpuUsage, setCpuUsage] = useState(18);
    const [netLatency, setNetLatency] = useState(24);

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
            setCpuUsage(prev => Math.max(8, Math.min(45, prev + (Math.random() - 0.5) * 6)));
            setNetLatency(prev => Math.max(12, Math.min(80, prev + (Math.random() - 0.5) * 8)));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Status badge glow class ───────────────────────────────────────────────
    const getStatusGlowClass = () => {
        switch(status) {
            case 'SAFE':     return 'status-glow-safe';
            case 'ELEVATED': return 'status-glow-elevated';
            case 'WARNING':  return 'status-glow-warning';
            case 'CRITICAL': return 'status-glow-critical';
            case 'EVACUATE': return 'status-glow-critical';
            default:         return '';
        }
    };

    return (
        <header className="border-b border-white/10 bg-amd-dark/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Animated Logo */}
            <div className="w-9 h-9 border border-amd-red flex items-center justify-center relative group">
               <Activity className="h-5 w-5 text-amd-red animate-glow-breathe" />
               <div className="absolute top-0 right-0 w-1 h-1 bg-white"/>
               <div className="absolute bottom-0 left-0 w-1 h-1 bg-white"/>
               <div className="absolute inset-0 border border-amd-red/50 opacity-0 group-hover:opacity-100 group-hover:animate-pulse-ring" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] font-mono text-white flex items-center gap-2">
                CROWD<span className="text-amd-red neon-red">PULSE</span>
              </h1>
              <div className="text-[9px] text-amd-silver tracking-[0.3em] uppercase opacity-70">
                AUTONOMOUS CROWD INTELLIGENCE PLATFORM • CRAFTED BY TEAM FANTASTIC FOUR
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-amd-silver">
                <Clock size={12} className="text-neon-blue animate-glow-breathe" />
                <span>{time.toLocaleTimeString()}</span>
            </div>

            {/* System Vitals */}
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-amd-silver">
               <div className="flex items-center gap-1.5">
                 <Cpu size={12} className={cpuUsage > 30 ? 'text-neon-amber' : 'text-neon-blue'}/>
                 <span>CPU: <span className={cpuUsage > 30 ? 'text-neon-amber' : 'text-neon-blue'}>{Math.round(cpuUsage)}%</span></span>
               </div>
               <div className="flex items-center gap-1.5">
                 <Signal size={12} className={wsConnected ? 'text-neon-green' : 'text-red-500 animate-pulse'}/>
                 <span>NET: <span className={wsConnected ? 'text-neon-green' : 'text-red-400'}>{wsConnected ? `${Math.round(netLatency)}ms` : 'DOWN'}</span></span>
               </div>
            </div>

            {/* ── SENSOR NETWORK indicator (ESP32 Wi-Fi zones) ── */}
            <div
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 border text-[9px] font-mono rounded-sm transition-all duration-500 ${
                    activeWifiZones > 0
                        ? 'border-neon-green/40 bg-neon-green/5 text-neon-green'
                        : 'border-white/10 bg-transparent text-amd-silver/40'
                }`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${activeWifiZones > 0 ? 'sensor-dot-active animate-pulse' : 'sensor-dot-offline'}`}/>
                <Wifi size={10}/>
                <span>
                    {activeWifiZones > 0 ? `${activeWifiZones} ZONE${activeWifiZones !== 1 ? 'S' : ''}` : 'NO SENSORS'}
                </span>
            </div>

            {/* ── Status Badge ── */}
            <div
                className={`px-4 py-1.5 border ${getStatusColor(status)} rounded-sm text-xs font-bold tracking-widest flex items-center gap-2 bg-black/60 ${getStatusGlowClass()} transition-all duration-300`}
            >
              <div className={`w-2 h-2 rounded-full ${
                  status === 'SAFE'     ? 'bg-neon-green animate-pulse' :
                  status === 'ELEVATED' ? 'bg-yellow-500 animate-pulse' :
                  status === 'WARNING'  ? 'bg-orange-500 animate-pulse' :
                  'bg-red-500 animate-ping'
              }`}/>
              {status}
            </div>
          </div>
        </div>
      </header>
    );
};

export default Header;
