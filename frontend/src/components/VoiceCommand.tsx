import React, { useEffect } from 'react';
// @ts-ignore
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff } from 'lucide-react';

interface VoiceCommandProps {
    onCommand: (cmd: string) => void;
}

const VoiceCommand: React.FC<VoiceCommandProps> = ({ onCommand }) => {
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    useEffect(() => {
        if (transcript) {
            console.log("Voice Transcript:", transcript);
            const lower = transcript.toLowerCase();
            
            // Debounce or wait for pause? simpler to just check continuously and reset
            if (lower.includes('status')) {
                onCommand('status');
                resetTranscript();
            } else if (lower.includes('thermal') || lower.includes('heat')) {
                onCommand('switch_thermal');
                resetTranscript();
            } else if (lower.includes('optical') || lower.includes('normal')) {
                onCommand('switch_optical');
                resetTranscript();
            } else if (lower.includes('record') || lower.includes('start recording')) {
                onCommand('start_recording');
                resetTranscript();
            } else if (lower.includes('stop')) {
                onCommand('stop_recording');
                resetTranscript();
            }
        }
    }, [transcript, onCommand, resetTranscript]);

    if (!browserSupportsSpeechRecognition) {
        return null;
    }

    return (
        <div className="flex items-center gap-3 p-2 bg-black/60 border border-white/10 backdrop-blur-sm">
            <button 
                onClick={() => listening ? SpeechRecognition.stopListening() : SpeechRecognition.startListening({ continuous: true })}
                className={`p-2 rounded-sm border border-white/20 transition-all hover:scale-105 ${listening ? 'bg-amd-red text-white animate-pulse shadow-[0_0_10px_#ed1c24]' : 'bg-black/80 text-amd-silver'}`}
            >
                {listening ? <Mic size={16}/> : <MicOff size={16}/>}
            </button>
            <span className="font-mono text-[10px] text-amd-silver tracking-widest uppercase">
                {listening ? (transcript || "LISTENING...") : "VOICE CMD"}
            </span>
        </div>
    );
};

export default VoiceCommand;
