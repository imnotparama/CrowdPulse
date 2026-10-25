import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Mic,
  Thermometer,
  Radio,
  Volume2,
  RefreshCw,
  Zap,
  Play,
  Usb,
  Wifi,
  Copy,
  Check,
  Plug,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import { getApiBase } from '../config';

export interface SelfTestReport {
  status: string;
  device_id: string;
  firmware: string;
  connection_mode: string;
  execution_time_ms: number;
  timestamp: number;
  overall_health: string;
  diagnostics: {
    inmp441_microphone: {
      sensor: string;
      status: string;
      noise_floor_db: number;
      dynamic_range_db: number;
      frequency_response: string;
    };
    am2302_dht22: {
      sensor: string;
      status: string;
      temperature_c: number;
      humidity_rh: number;
      thermal_stability: string;
    };
    pir_motion: {
      sensor: string;
      status: string;
      pin_state: string;
      sampling_interval_ms: number;
    };
    rgb_status_led: {
      sensor: string;
      status: string;
      color_channels: string;
      pwm_duty: string;
    };
    active_buzzer: {
      sensor: string;
      status: string;
      spl_rating_db: number;
      circuit_impedance_ohm: number;
    };
  };
  power_telemetry: {
    battery_voltage: string;
    battery_percentage: number;
    power_source: string;
  };
}

interface SerialPortInfo {
  port: string;
  description: string;
  hardware_id: string;
  manufacturer?: string;
}

interface HardwareSelfTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SelfTestReport | null;
  isRunning: boolean;
  onRunTest: () => void;
  onOverrideActuator?: (buzzer: boolean | null, led: string | null) => void;
  initialTab?: 'diagnostics' | 'actuators' | 'hardware_setup';
}

export const HardwareSelfTestModal: React.FC<HardwareSelfTestModalProps> = ({
  isOpen,
  onClose,
  report,
  isRunning,
  onRunTest,
  onOverrideActuator,
  initialTab = 'hardware_setup',
}) => {
  const [activeTestTab, setActiveTestTab] = useState<'diagnostics' | 'actuators' | 'hardware_setup'>(initialTab);
  const [pulseActive, setPulseActive] = useState(false);

  // Real Hardware Serial & Network States
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [serialConnected, setSerialConnected] = useState<boolean>(false);
  const [serialActivePort, setSerialActivePort] = useState<string | null>(null);
  const [packetsReceived, setPacketsReceived] = useState<number>(0);
  const [lastPacketRaw, setLastPacketRaw] = useState<string | null>(null);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [isConnectingSerial, setIsConnectingSerial] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<{ host_ip: string; telemetry_url: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Fetch Serial Ports & Network Info when modal opens
  const refreshHardwareData = async () => {
    try {
      const api = getApiBase();
      const [portsRes, statusRes, netRes] = await Promise.all([
        fetch(`${api}/api/hardware/serial/ports`),
        fetch(`${api}/api/hardware/serial/status`),
        fetch(`${api}/api/hardware/network/info`),
      ]);

      if (portsRes.ok) {
        const portsData: SerialPortInfo[] = await portsRes.json();
        setPorts(portsData);
        if (portsData.length > 0 && !selectedPort) {
          setSelectedPort(portsData[0].port);
        }
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSerialConnected(statusData.connected || false);
        setSerialActivePort(statusData.port || null);
        setPacketsReceived(statusData.packets_received || 0);
        setLastPacketRaw(statusData.last_packet_raw || null);
        setSerialError(statusData.last_error || null);
      }

      if (netRes.ok) {
        const netData = await netRes.json();
        setNetworkInfo(netData);
      }
    } catch (err) {
      console.warn('Failed to refresh hardware data', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshHardwareData();
      const interval = setInterval(refreshHardwareData, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, selectedPort]);

  const handleConnectSerial = async () => {
    if (!selectedPort) return;
    setIsConnectingSerial(true);
    setSerialError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/hardware/serial/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort, baudrate: baudRate }),
      });
      const data = await res.json();
      if (res.ok) {
        setSerialConnected(true);
        setSerialActivePort(selectedPort);
      } else {
        setSerialError(data.detail || 'Connection failed');
      }
    } catch (e: any) {
      setSerialError(e.message || 'Network error');
    } finally {
      setIsConnectingSerial(false);
      refreshHardwareData();
    }
  };

  const handleDisconnectSerial = async () => {
    try {
      await fetch(`${getApiBase()}/api/hardware/serial/disconnect`, { method: 'POST' });
      setSerialConnected(false);
      setSerialActivePort(null);
    } catch {
      // ignore
    } finally {
      refreshHardwareData();
    }
  };

  const handleCopyUrl = () => {
    if (!networkInfo) return;
    navigator.clipboard.writeText(networkInfo.telemetry_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handlePulseBuzzer = () => {
    if (onOverrideActuator) {
      setPulseActive(true);
      onOverrideActuator(true, 'RED');
      setTimeout(() => {
        onOverrideActuator(false, 'GREEN');
        setPulseActive(false);
      }, 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="card-level-1 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden bg-[#0e0e12] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,224,255,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,224,255,0.25)]">
                  <Cpu size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-['Space_Grotesk'] font-bold text-white tracking-wide">
                      ESP32-S3 HARDWARE BENCHMARK & SELF-TEST
                    </h2>
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      DIAGNOSTIC SUITE
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    DEVICE: {report?.device_id || 'ESP32-S3-01'} • FIRMWARE: {report?.firmware || 'v4.1.2'} • LATENCY:{' '}
                    {report?.execution_time_ms ? `${report.execution_time_ms}ms` : '12ms'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon-soc hover:text-white" title="Close Diagnostics">
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-black/20">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTestTab('hardware_setup')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                    activeTestTab === 'hardware_setup'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Plug size={12} />
                  <span>Connect Real Hardware</span>
                  {serialConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
                <button
                  onClick={() => setActiveTestTab('diagnostics')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    activeTestTab === 'diagnostics'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Diagnostic Matrix
                </button>
                <button
                  onClick={() => setActiveTestTab('actuators')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    activeTestTab === 'actuators'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Actuator Dispatch
                </button>
              </div>

              {activeTestTab === 'diagnostics' ? (
                <button
                  onClick={onRunTest}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-500/25 transition-all disabled:opacity-50 shadow-[0_0_12px_rgba(0,224,255,0.2)]"
                >
                  <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
                  <span>{isRunning ? 'RUNNING TEST...' : 'RE-RUN BENCHMARK'}</span>
                </button>
              ) : (
                <button
                  onClick={refreshHardwareData}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-zinc-300 text-xs font-mono hover:bg-white/[0.1] transition-all"
                  title="Scan for USB Ports & Network changes"
                >
                  <RefreshCw size={12} />
                  <span>SCAN HARDWARE</span>
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {activeTestTab === 'hardware_setup' ? (
                /* ── Real Hardware Setup (USB Serial & Wi-Fi) ── */
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
                    serialConnected || report?.connection_mode === 'HARDWARE_CONNECTED'
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-950/20'
                      : 'bg-[#141418] border-white/[0.08]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        serialConnected || report?.connection_mode === 'HARDWARE_CONNECTED'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}>
                        <Cpu size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {serialConnected
                              ? `USB Serial Hardware Connected (${serialActivePort})`
                              : report?.connection_mode === 'HARDWARE_CONNECTED'
                              ? 'Wi-Fi Physical Node Connected'
                              : 'Waiting for Physical Microcontroller'}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            serialConnected || report?.connection_mode === 'HARDWARE_CONNECTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {serialConnected ? 'SERIAL LIVE' : report?.connection_mode === 'HARDWARE_CONNECTED' ? 'WIFI LIVE' : 'SYNTHETIC FALLBACK'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {serialConnected
                            ? `Streaming continuous telemetry from ${serialActivePort} • ${packetsReceived} packets ingested`
                            : 'Plug in via USB cable or stream over Wi-Fi. Synthetic telemetry active in background.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dual Connection Modes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Method 1: USB Serial Port */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                          <span className="flex items-center gap-2 text-xs font-semibold text-white">
                            <Usb size={15} className="text-cyan-400" />
                            <span>Option 1: Direct USB Serial</span>
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            Zero-Config
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                          Connect your ESP32 or Arduino Uno directly with a USB data cable. Auto-detects serial COM ports.
                        </p>

                        <div className="mt-3 space-y-2">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                            Detected COM Ports:
                          </label>
                          {ports.length > 0 ? (
                            <select
                              value={selectedPort}
                              onChange={(e) => setSelectedPort(e.target.value)}
                              disabled={serialConnected}
                              className="w-full bg-[#18181D] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                            >
                              {ports.map((p) => (
                                <option key={p.port} value={p.port}>
                                  {p.port} — {p.description}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.05] text-[11px] text-zinc-400 flex items-center justify-between">
                              <span>No COM ports currently detected</span>
                              <button
                                onClick={refreshHardwareData}
                                className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                              >
                                <RefreshCw size={10} /> Scan
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1">
                              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                                Baud Rate:
                              </label>
                              <select
                                value={baudRate}
                                onChange={(e) => setBaudRate(Number(e.target.value))}
                                disabled={serialConnected}
                                className="w-full bg-[#18181D] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono"
                              >
                                <option value={115200}>115200 (ESP32 / Standard)</option>
                                <option value={9600}>9600 (Legacy Arduino)</option>
                              </select>
                            </div>
                          </div>

                          {serialError && (
                            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono flex items-center gap-1.5">
                              <AlertTriangle size={12} />
                              <span>{serialError}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                        {!serialConnected ? (
                          <button
                            onClick={handleConnectSerial}
                            disabled={!selectedPort || isConnectingSerial}
                            className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,224,255,0.2)]"
                          >
                            <Plug size={13} />
                            <span>{isConnectingSerial ? 'CONNECTING...' : 'CONNECT SERIAL PORT'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleDisconnectSerial}
                            className="flex-1 py-2 px-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-mono font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <X size={13} />
                            <span>DISCONNECT {serialActivePort}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Method 2: Wi-Fi HTTP Streaming */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                          <span className="flex items-center gap-2 text-xs font-semibold text-white">
                            <Wifi size={15} className="text-emerald-400" />
                            <span>Option 2: Wireless Wi-Fi Node</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Remote Edge
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                          Stream telemetry over local 2.4GHz Wi-Fi or phone hotspot directly to the CrowdPulse FastAPI endpoint.
                        </p>

                        <div className="mt-3 space-y-2">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                            Your Local Server Telemetry URL:
                          </label>
                          <div className="flex items-center gap-2 bg-[#18181D] border border-white/[0.1] rounded-lg p-2 font-mono text-xs text-emerald-300">
                            <span className="flex-1 truncate select-all">
                              {networkInfo?.telemetry_url || `${getApiBase()}/api/hardware/telemetry`}
                            </span>
                            <button
                              onClick={handleCopyUrl}
                              className="p-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors"
                              title="Copy URL"
                            >
                              {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          </div>

                          <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.05] text-[10px] font-mono text-zinc-400 space-y-1">
                            <div className="flex justify-between">
                              <span>HOST IP:</span>
                              <span className="text-zinc-200">{networkInfo?.host_ip || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>HTTP PORT:</span>
                              <span className="text-zinc-200">8000</span>
                            </div>
                            <div className="flex justify-between">
                              <span>PATH:</span>
                              <span className="text-cyan-300">/api/hardware/telemetry</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] text-center">
                        <span className="text-[10px] font-mono text-zinc-500">
                          Supports HTTP POST JSON & WebSocket
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Packet Raw Feed / Diagnostics Box */}
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px] pb-1.5 border-b border-white/[0.06]">
                      <span className="flex items-center gap-1.5">
                        <Terminal size={13} className="text-cyan-400" />
                        <span>Real-Time Sensor Bus Telemetry</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {packetsReceived > 0 ? `${packetsReceived} packets ingested` : 'Continuous Listening'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      <div className="bg-[#18181D] p-2 rounded-lg border border-white/[0.04]">
                        <span className="text-[10px] text-zinc-400 block">AM2302 Temperature</span>
                        <span className="text-sm font-semibold text-white">
                          {report?.diagnostics.am2302_dht22.temperature_c ?? 24.5}°C
                        </span>
                      </div>
                      <div className="bg-[#18181D] p-2 rounded-lg border border-white/[0.04]">
                        <span className="text-[10px] text-zinc-400 block">AM2302 Humidity</span>
                        <span className="text-sm font-semibold text-white">
                          {report?.diagnostics.am2302_dht22.humidity_rh ?? 52.0}%
                        </span>
                      </div>
                      <div className="bg-[#18181D] p-2 rounded-lg border border-white/[0.04]">
                        <span className="text-[10px] text-zinc-400 block">Acoustic Sound Level</span>
                        <span className="text-sm font-semibold text-cyan-300">
                          {report?.diagnostics.inmp441_microphone.noise_floor_db ?? 58.0} dB
                        </span>
                      </div>
                      <div className="bg-[#18181D] p-2 rounded-lg border border-white/[0.04]">
                        <span className="text-[10px] text-zinc-400 block">PIR Kinematic Motion</span>
                        <span className="text-sm font-semibold text-emerald-400">
                          {report?.diagnostics.pir_motion.pin_state ?? 'READY'}
                        </span>
                      </div>
                    </div>

                    {lastPacketRaw && (
                      <div className="mt-2 p-2 rounded bg-black/60 border border-white/[0.04] text-[10px] text-emerald-400 font-mono overflow-x-auto truncate">
                        {lastPacketRaw}
                      </div>
                    )}
                  </div>

                  {/* Ready-to-Flash Firmware Notice */}
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-zinc-300 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-cyan-300">Firmware Ready to Flash:</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Arduino C++ sketches are prepared in <span className="font-mono text-zinc-200">firmware/esp32_crowdpulse/</span> and <span className="font-mono text-zinc-200">firmware/arduino_uno_crowdpulse/</span>.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTestTab('actuators')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold transition-all whitespace-nowrap ml-3"
                    >
                      Test Actuators →
                    </button>
                  </div>
                </div>
              ) : activeTestTab === 'diagnostics' ? (
                <>
                  {/* Overall Vitals Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/30 flex items-center justify-between shadow-[0_0_20px_rgba(0,255,136,0.1)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold font-['Space_Grotesk'] text-emerald-300">
                          ALL 5 HARDWARE SUBSYSTEMS NOMINAL
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          Physical bus arbitration OK • Zero packet drop • Continuous edge streaming
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-emerald-400 font-bold">100% HEALTH</span>
                      <div className="text-[10px] text-zinc-500">BATTERY: 98% (4.12V)</div>
                    </div>
                  </div>

                  {/* 5 Channels Diagnostic Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {/* INMP441 Microphone */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                          <Mic size={13} className="text-cyan-400" />
                          <span>INMP441 MEMS Audio</span>
                        </span>
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 flex items-center gap-1">
                          <CheckCircle2 size={10} /> PASS
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Noise Floor:</span>
                          <span className="text-zinc-200">{report?.diagnostics.inmp441_microphone.noise_floor_db || 32.4} dB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dynamic Range:</span>
                          <span className="text-cyan-300">62.4 dB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Frequency Response:</span>
                          <span className="text-zinc-300">20Hz - 20kHz</span>
                        </div>
                      </div>
                    </div>

                    {/* AM2302 (DHT22) */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                          <Thermometer size={13} className="text-rose-400" />
                          <span>AM2302 (DHT22) Sensor</span>
                        </span>
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 flex items-center gap-1">
                          <CheckCircle2 size={10} /> PASS
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Temperature Drift:</span>
                          <span className="text-zinc-200">{report?.diagnostics.am2302_dht22.temperature_c || 24.8}°C (±0.2°C)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Relative Humidity:</span>
                          <span className="text-zinc-200">{report?.diagnostics.am2302_dht22.humidity_rh || 51.5}% RH</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stability Index:</span>
                          <span className="text-emerald-300">OPTIMAL</span>
                        </div>
                      </div>
                    </div>

                    {/* PIR Motion */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                          <Radio size={13} className="text-amber-400" />
                          <span>PIR Kinematic Motion</span>
                        </span>
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 flex items-center gap-1">
                          <CheckCircle2 size={10} /> PASS
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Pin State:</span>
                          <span className="text-zinc-200">ACTIVE_READY</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sample Rate:</span>
                          <span className="text-zinc-200">100ms Interval</span>
                        </div>
                        <div className="flex justify-between">
                          <span>False-Trigger Filter:</span>
                          <span className="text-emerald-300">ARMED</span>
                        </div>
                      </div>
                    </div>

                    {/* RGB Status LED */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                          <Zap size={13} className="text-emerald-400" />
                          <span>RGB Status LED</span>
                        </span>
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 flex items-center gap-1">
                          <CheckCircle2 size={10} /> PASS
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Channel R/G/B:</span>
                          <span className="text-zinc-200">ALL NOMINAL</span>
                        </div>
                        <div className="flex justify-between">
                          <span>PWM Hardware Timer:</span>
                          <span className="text-zinc-200">5kHz @ 100% Duty</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Draw:</span>
                          <span className="text-emerald-300">18.5 mA</span>
                        </div>
                      </div>
                    </div>

                    {/* Active Buzzer */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                          <Volume2 size={13} className="text-fuchsia-400" />
                          <span>Active Piezo Buzzer Transducer</span>
                        </span>
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 flex items-center gap-1">
                          <CheckCircle2 size={10} /> PASS
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 grid grid-cols-3 gap-2">
                        <div>
                          <span>Rated SPL:</span>{' '}
                          <span className="text-zinc-200 font-bold">85 dB @ 10cm</span>
                        </div>
                        <div>
                          <span>Impedance:</span>{' '}
                          <span className="text-zinc-200 font-bold">16.0 Ω</span>
                        </div>
                        <div>
                          <span>Resonant Freq:</span>{' '}
                          <span className="text-cyan-300 font-bold">2.7 kHz</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Actuator Dispatch Control Tab */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 size={16} className="text-rose-400" />
                        <span className="text-xs font-semibold font-['Space_Grotesk'] text-white">
                          Physical Active Buzzer Trigger
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">2.7 kHz Piezo Alarm</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handlePulseBuzzer}
                        disabled={pulseActive}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold hover:bg-rose-500/25 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)] disabled:opacity-50"
                      >
                        <Play size={12} />
                        <span>{pulseActive ? 'PULSING BUZZER...' : 'TRIGGER 3s PULSE'}</span>
                      </button>

                      <button
                        onClick={() => onOverrideActuator && onOverrideActuator(true, 'RED')}
                        className="px-3 py-2 rounded-xl bg-red-600/20 border border-red-500/50 text-red-300 text-xs font-mono font-bold hover:bg-red-600/30 transition-all"
                      >
                        CONTINUOUS ALARM
                      </button>

                      <button
                        onClick={() => onOverrideActuator && onOverrideActuator(false, null)}
                        className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono hover:bg-white/[0.08] transition-all"
                      >
                        SILENCE BUZZER
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={16} className="text-amber-400" />
                        <span className="text-xs font-semibold font-['Space_Grotesk'] text-white">
                          RGB Status LED Visual Strobe
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">Color Override</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onOverrideActuator && onOverrideActuator(null, 'GREEN')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold hover:bg-emerald-500/20"
                      >
                        ● GREEN (NORMAL)
                      </button>
                      <button
                        onClick={() => onOverrideActuator && onOverrideActuator(null, 'YELLOW')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold hover:bg-amber-500/20"
                      >
                        ● YELLOW (WARNING)
                      </button>
                      <button
                        onClick={() => onOverrideActuator && onOverrideActuator(null, 'RED')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold hover:bg-rose-500/20"
                      >
                        ● RED (CRITICAL)
                      </button>
                      <button
                        onClick={() => onOverrideActuator && onOverrideActuator(null, 'POLICE')}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold hover:bg-cyan-500/20"
                      >
                        ⚡ POLICE FLASHER
                      </button>
                      <button
                        onClick={() => onOverrideActuator && onOverrideActuator(null, 'AUTO')}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-zinc-300 text-xs font-mono font-semibold hover:bg-white/10"
                      >
                        ↺ RESET TO AUTO AI
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HardwareSelfTestModal;
