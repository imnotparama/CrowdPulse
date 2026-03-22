import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

interface SplashScreenProps {
    onComplete: () => void;
}

const bootMessages = [
    { text: "INITIALIZING SENSOR NETWORK...", delay: 0 },
    { text: "CONNECTING TO ESP32 MESH NODES... OK", delay: 400 },
    { text: "LOADING YOLOv26m DETECTION MODEL... OK", delay: 800 },
    { text: "CALIBRATING DENSITY THRESHOLD MATRIX...", delay: 1400 },
    { text: "ESTABLISHING UPLINK TO COMMAND CENTER...", delay: 1900 },
    { text: "ACTIVATING WI-FI PROBE SENSORS... 68 DEVICES DETECTED", delay: 2300 },
    { text: "TEAM FANTASTIC FOUR PROTOCOLS INITIATED...", delay: 2700 },
    { text: "MOUNTING EVACUATION ROUTE DATABASE... 3 ROUTES LOADED", delay: 3200 },
    { text: "BYTETRACK MULTI-OBJECT TRACKER ONLINE", delay: 3600 },
    { text: "RUNNING SYSTEM DIAGNOSTICS... ALL SYSTEMS GREEN", delay: 4000 },
    { text: "AUTONOMOUS CROWD INTELLIGENCE PLATFORM — ONLINE", delay: 4400 },
];

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const [visibleLines, setVisibleLines] = useState<number>(0);
    const [progress, setProgress] = useState(0);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        bootMessages.forEach((msg, i) => {
            setTimeout(() => setVisibleLines(i + 1), msg.delay);
        });

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + 2;
            });
        }, 80);

        const fadeTimer = setTimeout(() => setFading(true), 4800);
        const completeTimer = setTimeout(() => onComplete(), 5400);

        return () => {
            clearInterval(progressInterval);
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <AnimatePresence>
            {!fading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center"
                >
                    {/* Grid background */}
                    <div className="absolute inset-0 grid-bg opacity-30" />

                    {/* Logo */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-4 mb-12"
                    >
                        <div className="w-14 h-14 border-2 border-amd-red flex items-center justify-center relative">
                            <Activity className="h-8 w-8 text-amd-red" style={{ animation: 'pulse 2s ease-in-out infinite', animationName: 'none' }} />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amd-red" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amd-red" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-[0.3em] font-mono text-white">
                                CROWD<span className="text-amd-red">PULSE</span>
                            </h1>
                            <div className="text-[10px] text-amd-silver tracking-[0.5em] uppercase">
                                AUTONOMOUS CROWD INTELLIGENCE <br/> CRAFTED BY TEAM FANTASTIC FOUR
                            </div>
                        </div>
                    </motion.div>

                    {/* Terminal Output */}
                    <div className="w-[500px] max-w-[90vw] font-mono text-[11px] space-y-1 mb-8">
                        {bootMessages.slice(0, visibleLines).map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15 }}
                                className={`flex items-center gap-2 ${i === bootMessages.length - 1 ? 'text-neon-green font-bold' : 'text-amd-silver/70'}`}
                            >
                                <span className="text-amd-red">▸</span>
                                {msg.text}
                            </motion.div>
                        ))}
                        {visibleLines < bootMessages.length && (
                            <span className="text-amd-red animate-pulse">█</span>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-[500px] max-w-[90vw]">
                        <div className="flex justify-between text-[9px] font-mono text-amd-silver/50 mb-1">
                            <span>SYSTEM BOOT</span>
                            <span>{Math.min(progress, 100)}%</span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 overflow-hidden">
                            <motion.div
                                className="h-full bg-amd-red"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.1 }}
                            />
                        </div>
                    </div>

                    {/* Decorative corners */}
                    <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-amd-red/30" />
                    <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-amd-red/30" />
                    <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-amd-red/30" />
                    <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-amd-red/30" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;
