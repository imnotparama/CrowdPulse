import React from 'react';
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

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtext, icon: Icon, color = "text-white", chart, className }) => {
    return (
        <div className={`card flex flex-col justify-between bg-black/50 ${className}`}>
            <div className="card-header !mb-1">
              <span className="card-title"><Icon size={12}/> {title}</span>
              <span className="text-[10px] font-mono text-neon-blue animate-pulse-fast">LIVE</span>
            </div>
            <div className="flex items-end justify-between">
               <div className={`text-3xl font-mono font-bold tracking-tighter ${color}`}>
                 {value}
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
