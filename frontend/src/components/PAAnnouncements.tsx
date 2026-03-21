import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PAAnnouncementsProps {
    density: number;
    status: string;
    sectors: { name: string; count: number; status: string }[];
    capacity_pct: number;
}

const PAAnnouncements: React.FC<PAAnnouncementsProps> = ({ status, sectors, capacity_pct }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const getAnnouncements = () => {
        const msgs: { text: string; priority: 'info' | 'warning' | 'critical' }[] = [];

        if (status === 'CRITICAL') {
            msgs.push({ text: "⚠ ATTENTION: All personnel deploy to crowd control positions. Density at critical levels.", priority: 'critical' });
        }
        
        const critSectors = sectors.filter(s => s.status === 'CRITICAL');
        if (critSectors.length > 0) {
            msgs.push({ text: `🔴 Sector${critSectors.length > 1 ? 's' : ''} ${critSectors.map(s => s.name).join(', ')} at maximum density. Redirect foot traffic.`, priority: 'critical' });
        }

        if (capacity_pct > 85) {
            msgs.push({ text: "🚧 Venue approaching max capacity. Close Entry Gates A and C.", priority: 'warning' });
        } else if (capacity_pct > 60) {
            msgs.push({ text: "📢 Crowd volume increasing. Pre-stage response teams at Gates B and D.", priority: 'warning' });
        }

        const warnSectors = sectors.filter(s => s.status === 'WARNING');
        if (warnSectors.length > 0) {
            msgs.push({ text: `⚡ Move away from ${warnSectors.map(s => s.name).join(', ')} zone. Use alternate pathways.`, priority: 'warning' });
        }

        if (msgs.length === 0) {
            msgs.push({ text: "✅ All zones nominal. Continue monitoring.", priority: 'info' });
        }

        return msgs.slice(0, 4);
    };

    const announcements = getAnnouncements();

    // Auto-cycle through announcements
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (announcements.length > 1) {
            timerRef.current = setInterval(() => {
                setActiveIdx(prev => (prev + 1) % announcements.length);
            }, 4000);
        } else {
            setActiveIdx(0);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [announcements.length]);

    const getPriorityStyle = (p: string) => {
        switch(p) {
            case 'critical': return 'border-red-500/50 bg-red-500/5 text-red-300';
            case 'warning': return 'border-orange-500/40 bg-orange-500/5 text-orange-300';
            default: return 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300';
        }
    };

    return (
        <div className="card bg-black/50">
            <div className="card-header !mb-2">
                <span className="card-title"><Megaphone size={12} /> PA SYSTEM</span>
                <div className="flex items-center gap-2">
                    <Volume2 size={10} className={status === 'CRITICAL' ? 'text-red-400 animate-pulse' : 'text-amd-silver/40'} />
                    <span className="text-[9px] font-mono text-amd-silver/40">AUTO</span>
                </div>
            </div>
            <div className="relative overflow-hidden" style={{ minHeight: '36px' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIdx}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`border-l-2 px-2 py-1.5 text-[9px] font-mono leading-tight ${getPriorityStyle(announcements[activeIdx % announcements.length]?.priority || 'info')}`}
                    >
                        {announcements[activeIdx % announcements.length]?.text}
                    </motion.div>
                </AnimatePresence>
            </div>
            {/* Progress dots */}
            {announcements.length > 1 && (
                <div className="flex items-center justify-center gap-1 mt-2">
                    {announcements.map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full transition-all ${i === activeIdx % announcements.length ? 'bg-amd-red w-3' : 'bg-white/20'}`} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PAAnnouncements;
