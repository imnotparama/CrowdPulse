import React, { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon: LucideIcon;
    color?: string;
    chart?: React.ReactNode;
    className?: string;
}

// ── Animated Number with micro-flash on value change ─────────────────────────
const AnimatedNumber: React.FC<{ value: number, decimals?: number, className?: string }> = ({ value, decimals = 0, className }) => {
    const [display, setDisplay] = useState(value);
    const [flashClass, setFlashClass] = useState('');
    const prevRef = useRef(value);

    useEffect(() => {
        const prev = prevRef.current;
        const diff = value - prev;
        if (Math.abs(diff) < 0.01) { setDisplay(value); prevRef.current = value; return; }

        // Flash green on increase, red on decrease
        const flash = diff > 0 ? 'flash-up' : 'flash-down';
        setFlashClass(flash);
        const flashTimer = setTimeout(() => setFlashClass(''), 700);

        const duration = 300;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(prev + diff * eased);
            if (progress < 1) requestAnimationFrame(animate);
            else prevRef.current = value;
        };
        requestAnimationFrame(animate);

        return () => clearTimeout(flashTimer);
    }, [value]);

    return (
        <span className={`${className} ${flashClass} transition-colors duration-100`}>
            {display.toFixed(decimals)}
        </span>
    );
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtext, icon: Icon, color = "text-white", chart, className }) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    const isNumeric = !isNaN(numericValue);

    return (
        <div className={`card flex flex-col justify-between bg-black/50 ${className}`}>
            <div className="card-header !mb-1">
              <span className="card-title"><Icon size={12}/> {title}</span>
              <span className="live-badge text-[10px] font-mono text-neon-blue">LIVE</span>
            </div>
            <div className="flex items-end justify-between">
               <div className={`text-3xl font-mono font-bold tracking-tighter ${color}`}>
                 {isNumeric ? (
                     <AnimatedNumber
                         value={numericValue}
                         decimals={value.toString().includes('.') ? (value.toString().split('.')[1]?.length || 0) : 0}
                         className={color}
                     />
                 ) : value}
               </div>
               {subtext && (
                   <div className="text-[9px] text-amd-silver/60 font-mono leading-tight max-w-[120px] pb-0.5">
                     {subtext}
                   </div>
               )}
            </div>
             {chart && <div className="mt-2 w-full">{chart}</div>}
        </div>
    );
};

export default StatsCard;
