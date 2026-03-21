import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Zap, AlertTriangle, BarChart3 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface AIChatSidebarProps {
    chatOpen: boolean;
    setChatOpen: (open: boolean) => void;
    chatMessages: { role: 'user' | 'ai'; text: string }[];
    chatInput: string;
    setChatInput: (input: string) => void;
    handleChatSubmit: (e: React.FormEvent) => void;
    chatContainerRef: React.RefObject<HTMLDivElement | null>;
}

const TypingIndicator = () => (
    <div className="flex justify-start">
        <div className="bg-amd-red/10 border border-amd-red/30 px-3 py-2 rounded-sm flex gap-1">
            <span className="w-1.5 h-1.5 bg-amd-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-amd-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-amd-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    </div>
);

const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
    chatOpen,
    setChatOpen,
    chatMessages,
    chatInput,
    setChatInput,
    handleChatSubmit,
    chatContainerRef,
}) => {
    const [isTyping, setIsTyping] = useState(false);
    const prevLength = React.useRef(chatMessages.length);

    // Show typing indicator when waiting for AI response
    useEffect(() => {
        if (chatMessages.length > prevLength.current) {
            const last = chatMessages[chatMessages.length - 1];
            if (last.role === 'user') {
                setIsTyping(true);
            } else {
                setIsTyping(false);
            }
        }
        prevLength.current = chatMessages.length;
    }, [chatMessages]);

    const quickActions = [
        { label: 'STATUS', icon: BarChart3, cmd: 'status report' },
        { label: 'RISK', icon: AlertTriangle, cmd: 'risk assessment' },
        { label: 'EVACUATE', icon: Zap, cmd: 'evacuate' },
    ];

    return (
        <AnimatePresence>
            {chatOpen && (
                <motion.div 
                   initial={{ x: 300, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ x: 300, opacity: 0 }}
                   transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                   className="absolute right-0 top-0 h-full w-80 bg-black/95 backdrop-blur-xl border-l border-amd-red z-50 flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-amd-red/30">
                        <h3 className="text-amd-red font-mono font-bold flex items-center gap-2">
                            <MessageSquare size={16}/>
                            <span>PULSE AI</span>
                            <span className="text-[8px] bg-amd-red/20 text-amd-red px-1.5 py-0.5 rounded-sm">v4.0</span>
                        </h3>
                        <button onClick={() => setChatOpen(false)} className="text-amd-silver hover:text-white transition-colors p-1 hover:bg-white/5 rounded">
                            <X size={16}/>
                        </button>
                    </div>
                    
                    {/* Messages */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 p-4 font-mono text-xs scrollbar-hide">
                        <AnimatePresence>
                            {chatMessages.map((msg, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-2.5 rounded-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-amd-gray text-white border border-white/10' 
                                            : 'bg-amd-red/10 text-amd-red border border-amd-red/30'
                                    }`}>
                                        {msg.role === 'ai' && (
                                            <div className="text-[8px] text-amd-red/50 mb-1 uppercase tracking-wider">PULSE AI</div>
                                        )}
                                        {msg.text}
                                        <div className="text-[7px] text-amd-silver/30 mt-1.5 text-right">
                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {isTyping && <TypingIndicator />}
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 flex gap-1.5 border-t border-white/5">
                        {quickActions.map(action => (
                            <button
                                key={action.label}
                                onClick={() => {
                                    setChatInput(action.cmd);
                                    // Trigger submit after setting input
                                    setTimeout(() => {
                                        const form = document.getElementById('chat-form') as HTMLFormElement;
                                        if (form) form.requestSubmit();
                                    }, 50);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-[8px] font-mono text-amd-silver border border-white/10 hover:border-amd-red/40 hover:text-amd-red transition-colors rounded-sm"
                            >
                                <action.icon size={9} />
                                {action.label}
                            </button>
                        ))}
                    </div>

                    {/* Input */}
                    <form id="chat-form" onSubmit={handleChatSubmit} className="p-4 pt-2 relative">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="ENTER COMMAND..." 
                            className="w-full bg-black border border-amd-silver/30 p-2.5 pr-10 text-xs font-mono text-white focus:border-amd-red focus:outline-none focus:shadow-[0_0_10px_rgba(237,28,36,0.2)] transition-all rounded-sm"
                        />
                        <button type="submit" className="absolute right-6 top-1/2 -translate-y-1/2 text-amd-red hover:scale-110 transition-transform">
                            <Send size={14}/>
                        </button>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AIChatSidebar;
