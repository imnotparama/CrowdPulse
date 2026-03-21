import React, { useState } from 'react';
import { Mic, MicOff, Keyboard } from 'lucide-react';

interface VoiceCommandProps {
    onCommand: (cmd: string) => void;
}

const VoiceCommand: React.FC<VoiceCommandProps> = ({ onCommand }) => {
    const [isListening, setIsListening] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    
    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const cmd = event.results[0][0].transcript.toLowerCase();
            onCommand(cmd.trim());
        };

        recognition.start();
    };

    const shortcuts = [
        { key: 'S', action: 'Toggle SOS' },
        { key: 'T', action: 'Thermal/Optical' },
        { key: 'R', action: 'Record' },
    ];

    return (
        <div className="flex items-center gap-2">
            {/* Voice Command */}
            <button 
                onClick={startListening}
                className={`flex-1 flex items-center justify-center gap-2 py-2 border font-mono text-[10px] tracking-wider transition-all ${
                    isListening 
                        ? 'bg-amd-red border-amd-red text-white animate-pulse-fast shadow-[0_0_15px_rgba(237,28,36,0.3)]' 
                        : 'bg-black/40 border-white/10 text-amd-silver hover:border-white/30 hover:text-white'
                }`}
            >
                {isListening ? <Mic size={12} /> : <MicOff size={12} className="opacity-50" />}
                {isListening ? 'LISTENING...' : 'VOICE CMD'}
            </button>

            {/* Keyboard Shortcuts Toggle */}
            <div className="relative">
                <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className={`px-2 py-2 border font-mono text-[10px] transition-all ${
                        showHelp 
                            ? 'bg-neon-blue/10 border-neon-blue/40 text-neon-blue' 
                            : 'bg-black/40 border-white/10 text-amd-silver/50 hover:text-white hover:border-white/30'
                    }`}
                >
                    <Keyboard size={12} />
                </button>
                
                {showHelp && (
                    <div className="absolute bottom-full right-0 mb-1 bg-black/95 border border-white/10 p-2 min-w-[140px] z-50">
                        <div className="text-[8px] font-mono text-amd-silver/50 mb-1.5 uppercase tracking-wider">Shortcuts</div>
                        {shortcuts.map(s => (
                            <div key={s.key} className="flex items-center justify-between text-[9px] font-mono py-0.5">
                                <kbd className="bg-white/10 px-1.5 py-0.5 text-white rounded-sm text-[8px]">{s.key}</kbd>
                                <span className="text-amd-silver/60">{s.action}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceCommand;
