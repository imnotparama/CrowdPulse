import React, { useState, useEffect } from 'react';
import { Sparkles, Send, X, Bot } from 'lucide-react';
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
    <div className="bg-white/[0.04] border border-white/[0.08] px-3 py-2 rounded-xl flex gap-1 items-center">
      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
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

  useEffect(() => {
    if (chatMessages.length > prevLength.current) {
      const last = chatMessages[chatMessages.length - 1];
      setIsTyping(last.role === 'user');
    }
    prevLength.current = chatMessages.length;
  }, [chatMessages]);

  const quickPrompts = [
    { label: 'Status Briefing', cmd: 'status report' },
    { label: 'Risk Analysis', cmd: 'risk assessment' },
    { label: 'Evacuation Plan', cmd: 'evacuate' },
  ];

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed right-0 top-14 bottom-0 w-88 bg-[#121215]/95 backdrop-blur-2xl border-l border-white/[0.08] z-50 flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Bot size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-['Space_Grotesk'] text-white">
                  CrowdPulse AI
                </h3>
                <p className="text-[10px] font-mono text-zinc-400">
                  Predictive Reasoning Engine
                </p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Proactive Live AI Callout */}
          <div className="p-3 mx-4 mt-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 font-['Space_Grotesk'] mb-1">
              <Sparkles size={13} />
              <span>Proactive Assessment</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Current crowd is safe. Predicted density increase near Gate A in <strong>2 minutes</strong>. Recommend pre-staging personnel or opening Gate B.
            </p>
          </div>

          {/* Message Thread */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-3 p-4 font-sans text-xs scrollbar-none"
          >
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                      : 'bg-white/[0.03] text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  {msg.role === 'ai' && (
                    <div className="text-[10px] font-mono text-cyan-400 font-semibold mb-1 flex items-center gap-1">
                      <Sparkles size={10} /> CROWDPULSE AI
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 flex items-center gap-1.5 border-t border-white/[0.04]">
            {quickPrompts.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setChatInput(p.cmd);
                  setTimeout(() => {
                    const form = document.getElementById('ai-chat-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }, 50);
                }}
                className="text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form id="ai-chat-form" onSubmit={handleChatSubmit} className="p-4 pt-2 border-t border-white/[0.06]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask CrowdPulse AI..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <button
                type="submit"
                className="absolute right-2.5 text-cyan-400 hover:text-cyan-300 transition-colors p-1"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIChatSidebar;
