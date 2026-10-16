import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Camera,
  Eye,
  FileText,
  Cpu,
  FolderLock,
  Volume2,
  Siren,
  Flame,
  TrendingUp,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  category: 'CAMERAS' | 'VISION & OVERLAYS' | 'OPERATIONS' | 'EMERGENCY';
  title: string;
  description: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: (cam: string) => void;
  onToggleVision: () => void;
  onOpenReport: () => void;
  onOpenSelfTest: () => void;
  onOpenVault: () => void;
  onToggleSound: () => void;
  onToggleSos: () => void;
  onSnapshot: () => void;
  onPulseBuzzer: () => void;
  onPoliceLed: () => void;
  onResetActuators: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onToggleVision,
  onOpenReport,
  onOpenSelfTest,
  onOpenVault,
  onToggleSound,
  onToggleSos,
  onSnapshot,
  onPulseBuzzer,
  onPoliceLed,
  onResetActuators,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // Cameras
    {
      id: 'cam-entrance',
      category: 'CAMERAS',
      title: 'Switch to Entrance Feed',
      description: 'Main pedestrian arrival turnstiles',
      icon: Camera,
      shortcut: '1',
      action: () => onSelectCamera('Entrance'),
    },
    {
      id: 'cam-exit',
      category: 'CAMERAS',
      title: 'Switch to Exit Feed',
      description: 'North egress clearance corridor',
      icon: Camera,
      shortcut: '2',
      action: () => onSelectCamera('Exit'),
    },
    {
      id: 'cam-foodcourt',
      category: 'CAMERAS',
      title: 'Switch to Food Court Feed',
      description: 'High-dwell central gathering atrium',
      icon: Camera,
      shortcut: '3',
      action: () => onSelectCamera('Food Court'),
    },
    {
      id: 'cam-gatea',
      category: 'CAMERAS',
      title: 'Switch to Gate A Feed',
      description: 'Secondary queuing choke point',
      icon: Camera,
      shortcut: '4',
      action: () => onSelectCamera('Gate A'),
    },
    {
      id: 'cam-parking',
      category: 'CAMERAS',
      title: 'Switch to Parking Feed',
      description: 'Exterior perimeter & vehicular transition',
      icon: Camera,
      shortcut: '5',
      action: () => onSelectCamera('Parking'),
    },

    // Vision
    {
      id: 'toggle-vision',
      category: 'VISION & OVERLAYS',
      title: 'Toggle Thermal / Optical Spectrum',
      description: 'Switch between pseudocolor thermal heat and optical video',
      icon: Eye,
      shortcut: 'T',
      action: onToggleVision,
    },
    {
      id: 'snapshot',
      category: 'VISION & OVERLAYS',
      title: 'Capture High-Res Evidence Frame',
      description: 'Take instantaneous watermarked surveillance snapshot',
      icon: Camera,
      action: onSnapshot,
    },
    {
      id: 'heatmap',
      category: 'VISION & OVERLAYS',
      title: 'Simulate AI Crowd Heatmap',
      description: 'Visual overlay of dense gathering centers',
      icon: Flame,
      action: onSnapshot,
    },
    {
      id: 'flow-vectors',
      category: 'VISION & OVERLAYS',
      title: 'Toggle Flow Vector Currents',
      description: 'Show optical flow velocity arrows across screen',
      icon: TrendingUp,
      action: onSnapshot,
    },
    {
      id: 'hud-boxes',
      category: 'VISION & OVERLAYS',
      title: 'Toggle Person Tracking HUD',
      description: 'Individual bounding boxes, velocity tags, confidence',
      icon: Layers,
      action: onSnapshot,
    },

    // Operations
    {
      id: 'report-audit',
      category: 'OPERATIONS',
      title: 'Generate Forensic Incident Audit Dossier',
      description: 'Legal compliance printable document & JSON export',
      icon: FileText,
      shortcut: 'P',
      action: onOpenReport,
    },
    {
      id: 'hardware-selftest',
      category: 'OPERATIONS',
      title: 'Run ESP32-S3 Multi-Sensor Diagnostic Test',
      description: 'Benchmark INMP441, AM2302, PIR, LED & Buzzer latency',
      icon: Cpu,
      action: onOpenSelfTest,
    },
    {
      id: 'vault-evidence',
      category: 'OPERATIONS',
      title: 'Open Secure Cryptographic Evidence Vault',
      description: 'Hold-to-decrypt restricted video captures',
      icon: FolderLock,
      action: onOpenVault,
    },
    {
      id: 'toggle-sound',
      category: 'OPERATIONS',
      title: 'Toggle Alert Sound & Synthesis',
      description: 'Enable or mute alarm audio and synthesized voice alerts',
      icon: Volume2,
      action: onToggleSound,
    },

    // Emergency
    {
      id: 'emergency-sos',
      category: 'EMERGENCY',
      title: 'Trigger / Cancel Emergency SOS',
      description: 'Broadcast full venue evacuation beacon',
      icon: Siren,
      shortcut: 'S',
      action: onToggleSos,
    },
    {
      id: 'buzzer-pulse',
      category: 'EMERGENCY',
      title: 'Trigger Hardware Buzzer Pulse (3s)',
      description: 'Send acoustic alert burst to physical ESP32-S3 buzzer',
      icon: Volume2,
      action: onPulseBuzzer,
    },
    {
      id: 'led-police',
      category: 'EMERGENCY',
      title: 'Override RGB LED: Police Strobe',
      description: 'Activate emergency warning flasher on physical sensing node',
      icon: Zap,
      action: onPoliceLed,
    },
    {
      id: 'actuator-reset',
      category: 'EMERGENCY',
      title: 'Reset Hardware Actuators to Auto AI',
      description: 'Clear all manual overrides and restore closed-loop AI control',
      icon: Zap,
      action: onResetActuators,
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filteredCommands.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-[10vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: -15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -15 }}
            className="card-level-1 max-w-xl w-full bg-[#0c0c10] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,224,255,0.2)] rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-black/40">
              <Search size={18} className="text-cyan-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search actions... (e.g. camera, report, buzzer)"
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 font-sans focus:outline-none"
              />
              <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.06] px-2 py-0.5 rounded border border-white/10 flex-shrink-0">
                ESC TO EXIT
              </span>
            </div>

            {/* Command List */}
            <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-white/[0.03]">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500">
                  No matching operations found for "{search}"
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = cmd.icon;

                  return (
                    <div
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500/15 border border-cyan-500/40 text-white shadow-[0_0_15px_rgba(0,224,255,0.1)]'
                          : 'text-zinc-300 hover:bg-white/[0.02] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                              : 'bg-white/[0.04] text-zinc-400'
                          }`}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold font-['Space_Grotesk'] text-white truncate flex items-center gap-2">
                            <span>{cmd.title}</span>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                              [{cmd.category}]
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400 truncate">{cmd.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {cmd.shortcut && (
                          <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10">
                            {cmd.shortcut}
                          </span>
                        )}
                        <ArrowRight
                          size={13}
                          className={`transition-transform ${
                            isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-zinc-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] bg-black/40 text-[10px] font-mono text-zinc-500">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Execute</span>
                <span>ESC Close</span>
              </div>
              <span className="text-cyan-400 font-semibold">CROWDPULSE OPERATIONAL CLI</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
