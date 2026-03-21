import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Radio, Wifi, Clock, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
    status: string;
    getStatusColor: (status: string) => string;
    wsConnected?: boolean;
}

const Header: React.FC<HeaderProps> = ({ status, getStatusColor, wsConnected = true }) => {
    const [time, setTime] = useState(new Date());
    const [cpuUsage, setCpuUsage] = useState(18);
    const [netLatency, setNetLatency] = useState(24);
    
    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
            // Simulate realistic fluctuating vitals
            setCpuUsage(prev => Math.max(8, Math.min(45, prev + (Math.random() - 0.5) * 6)));
            setNetLatency(prev => Math.max(12, Math.min(80, prev + (Math.random() - 0.5) * 8)));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="border-b border-white/10 bg-amd-dark/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Animated Logo */}
            <div className="w-9 h-9 border border-amd-red flex items-center justify-center relative group">
               <Activity className="h-5 w-5 text-amd-red animate-glow-breathe" />
               <div className="absolute top-0 right-0 w-1 h-1 bg-white"></div>
               <div className="absolute bottom-0 left-0 w-1 h-1 bg-white"></div>
               {/* Pulse ring on hover */}
               <div className="absolute inset-0 border border-amd-red/50 opacity-0 group-hover:opacity-100 group-hover:animate-pulse-ring" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] font-mono text-white flex items-center gap-2">
                CROWD<span className="text-amd-red neon-red">PULSE</span>
              </h1>
              <div className="text-[9px] text-amd-silver tracking-[0.3em] uppercase opacity-70">
                AI Powered Crowd Safety System v4.0
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-amd-silver">
                <Clock size={12} className="text-neon-blue animate-glow-breathe" />
                <span>{time.toLocaleTimeString()}</span>
            </div>
            
            {/* Animated System Vitals */}
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-amd-silver">
               <div className="flex items-center gap-1.5">
                 <Cpu size={12} className={cpuUsage > 30 ? 'text-neon-amber' : 'text-neon-blue'}/>
                 <span>CPU: <span className={cpuUsage > 30 ? 'text-neon-amber' : 'text-neon-blue'}>{Math.round(cpuUsage)}%</span></span>
               </div>
               <div className="flex items-center gap-1.5">
                 <Wifi size={12} className="text-neon-green"/>
                 <span>SENSORS: <span className="text-neon-green">OK</span></span>
               </div>
               <div className="flex items-center gap-1.5">
                 <Signal size={12} className={wsConnected ? 'text-neon-green' : 'text-red-500 animate-pulse'}/>
                 <span>NET: <span className={wsConnected ? 'text-neon-green' : 'text-red-400'}>{wsConnected ? `${Math.round(netLatency)}ms` : 'DOWN'}</span></span>
               </div>
            </div>

            {/* Status Badge with smooth transitions */}
            <AnimatePresence mode="wait">
                <motion.div 
                    key={status}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`px-4 py-1.5 border ${getStatusColor(status)} rounded-sm text-xs font-bold tracking-widest flex items-center gap-2 bg-black/60`}
                >
                  <div className={`w-2 h-2 rounded-full ${status === 'SAFE' ? 'bg-neon-green animate-pulse' : status === 'ELEVATED' ? 'bg-yellow-500 animate-pulse' : status === 'WARNING' ? 'bg-orange-500 animate-pulse' : 'bg-red-500 animate-ping'}`}></div>
                  {status}
                </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </header>
    );
};

export default Header;
