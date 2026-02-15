import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Radio, Wifi, Clock } from 'lucide-react';

interface HeaderProps {
    status: string;
    getStatusColor: (status: string) => string;
}

const Header: React.FC<HeaderProps> = ({ status, getStatusColor }) => {
    const [time, setTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="border-b border-white/10 bg-amd-dark/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 border border-amd-red flex items-center justify-center relative">
               <Activity className="h-5 w-5 text-amd-red animate-pulse-fast" />
               <div className="absolute top-0 right-0 w-1 h-1 bg-white"></div>
               <div className="absolute bottom-0 left-0 w-1 h-1 bg-white"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] font-mono text-white flex items-center gap-2">
                CROWD<span className="text-amd-red">PULSE</span>
              </h1>
              <div className="text-[9px] text-amd-silver tracking-[0.3em] uppercase opacity-70">
                AI Powered Crowd Safety System v3.0
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-amd-silver">
                <Clock size={12} className="text-neon-blue" />
                <span>{time.toLocaleTimeString()}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-amd-silver">
               <div className="flex items-center gap-1.5">
                 <Cpu size={12} className="text-neon-blue"/>
                 <span>CPU: 18%</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <Wifi size={12} className="text-neon-green"/>
                 <span>SENSORS: OK</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <Radio size={12} className="text-neon-green"/>
                 <span>NET: STEADY</span>
               </div>
            </div>

            <div className={`px-4 py-1.5 border ${getStatusColor(status)} rounded-sm text-xs font-bold tracking-widest flex items-center gap-2 bg-black/60 transition-all duration-300`}>
              <div className={`w-2 h-2 rounded-full ${status === 'SAFE' ? 'bg-neon-green animate-pulse' : status === 'ELEVATED' ? 'bg-yellow-500 animate-pulse' : status === 'WARNING' ? 'bg-orange-500 animate-pulse' : 'bg-red-500 animate-ping'}`}></div>
              {status}
            </div>
          </div>
        </div>
      </header>
    );
};

export default Header;
