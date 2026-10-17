import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';

import Header from './components/Header';
import StatusCardsRow from './components/StatusCardsRow';
import AIInsightsCard from './components/AIInsightsCard';
import VideoFeed from './components/VideoFeed';
import Timeline from './components/Timeline';
import RiskGauge from './components/RiskGauge';
import LiveMap from './components/LiveMap';
import ActiveAlertsPanel from './components/ActiveAlertsPanel';
import AIChatSidebar from './components/AIChatSidebar';
import EvidenceLocker from './components/EvidenceLocker';
import SplashScreen from './components/SplashScreen';
import { EnvironmentCard, HardwareCard } from './components/HardwareSensorWidget';
import HardwareSelfTestModal, { type SelfTestReport } from './components/HardwareSelfTestModal';
import ForensicReportModal from './components/ForensicReportModal';
import CommandPalette from './components/CommandPalette';

interface WifiZone {
  count: number;
  rssi: number;
  status: 'ACTIVE' | 'OFFLINE';
}

interface AlertItem {
  id: number;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  // Safety net: show dashboard within 5.5s unconditionally
  useEffect(() => {
    const safetyTimer = setTimeout(() => setSplashDone(true), 5500);
    return () => clearTimeout(safetyTimer);
  }, []);

  const [activeCamera, setActiveCamera] = useState('Entrance');
  const [sosMode, setSosMode] = useState(false);

  // Video frame lives in a ref to prevent 30+ full-tree React re-renders per second
  const imageRef = useRef<string | null>(null);

  const [stats, setStats] = useState({
    count: 4,
    density: 0.12,
    agitation: 24,
    status: 'SAFE',
    timestamp: Date.now(),
    mode: 'OPTICAL',
    recording: false,
    predicted_density: 0.14,
    crowd_alert: null as { id: number; type: string; severity: string; message: string } | null,
    pressure_index: 18,
    capacity_pct: 2.0,
    max_capacity: 200,
    avg_velocity: 32,
    time_to_critical: -1,
    stampede_risk: 18,
    flow_direction: { angle: 45, label: 'EAST' },
    sectors: [] as { name: string; count: number; status: string }[],
    wifi_probe_count: 9,
    wifi_zones: {} as Record<string, WifiZone>,
    // Hardware layer
    temperature: 24.5,
    humidity: 52.0,
    noise_db: 58.0,
    motion_detected: false,
    sensor_health: 'OPTIMAL' as 'OPTIMAL' | 'DEGRADED' | 'OFFLINE',
    sensor_timestamp: Date.now(),
    buzzer_state: false,
    led_state: 'GREEN' as 'GREEN' | 'YELLOW' | 'RED',
    hardware_status: 'SIMULATED' as 'CONNECTED' | 'TIMEOUT' | 'SIMULATED',
    environment_risk: 18.0,
    fusion_confidence: 0.94,
    sensor_score: 22.0,
    heat_stress_index: 24.8,
    noise_index: 28.0,
    motion_activity_score: 15.0,
    combined_threat_score: 20.0,
    fusion_narrative: 'Nominal conditions across all visual and environmental channels.',
  });

  const [showTacticalTray, setShowTacticalTray] = useState(false);

  const [alertHistory, setAlertHistory] = useState<AlertItem[]>([]);
  const [persistentAlert, setPersistentAlert] = useState<AlertItem | null>(null);

  const wsMessageCount = useRef(0);
  const STATS_UPDATE_INTERVAL = 3;

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.05;
    msg.pitch = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) => v.lang.startsWith('en-') && (v.name.includes('Google') || v.name.includes('Natural'))
    );
    if (enVoice) msg.voice = enVoice;
    window.speechSynthesis.speak(msg);
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'CrowdPulse AI Core Online. All surveillance zones monitored.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [mapAlerts, setMapAlerts] = useState<{ lat: number; lng: number; type: string }[]>([]);

  const [lockerOpen, setLockerOpen] = useState(false);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const [selfTestOpen, setSelfTestOpen] = useState(false);
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [selfTestReport, setSelfTestReport] = useState<SelfTestReport | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [wsConnected, setWsConnected] = useState(false);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeWifiZones, setActiveWifiZones] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const playSound = (type: 'beep' | 'alert' | 'click') => {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'beep') {
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'click') {
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'alert') {
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.8);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    playSound('click');

    setTimeout(() => {
      let response = 'Analyzing query against crowd safety metrics. All sectors currently nominal.';
      const lower = userMsg.toLowerCase();

      if (lower.includes('status') || lower.includes('report')) {
        response = `System Status: ${stats.status}. Detected: ${stats.count} individuals. Density: ${stats.density.toFixed(2)}. Stampede Risk: ${stats.stampede_risk.toFixed(0)}/100.`;
      } else if (lower.includes('capacity') || lower.includes('people')) {
        response = `Venue Capacity: ${stats.count}/${stats.max_capacity} (${stats.capacity_pct.toFixed(0)}%). Safe operating margins.`;
      } else if (lower.includes('evacuate') || lower.includes('gate')) {
        response = 'Evacuation routes A, B, and C are clear. Recommend opening Gate B if density exceeds 0.4.';
      }

      setChatMessages((prev) => [...prev, { role: 'ai', text: response }]);
      playSound('beep');
    }, 500);
  };

  const fetchRecordings = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/recordings');
      const data = await res.json();
      setRecordings(data);
    } catch (e) {
      console.error('Failed to fetch recordings', e);
    }
  };

  const connectWebSocket = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket('ws://127.0.0.1:8000/ws');

    ws.current.onopen = () => {
      setWsConnected(true);
      reconnectAttempt.current = 0;
      playSound('beep');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'selftest_result' && data.report) {
        setSelfTestReport(data.report);
        setSelfTestRunning(false);
        setSelfTestOpen(true);
        playSound('beep');
        return;
      }

      if (data.image) {
        imageRef.current = data.image;
      }

      wsMessageCount.current += 1;
      const shouldUpdateStats = wsMessageCount.current % STATS_UPDATE_INTERVAL === 0;

      if (data.crowd_alert) {
        playSound('alert');
        if (data.crowd_alert.severity === 'CRITICAL') {
          speakText(`Priority Alert: ${data.crowd_alert.message}`);
        }

        const alertItem: AlertItem = {
          id: data.crowd_alert.id || Date.now(),
          type: data.crowd_alert.type,
          severity: data.crowd_alert.severity,
          message: data.crowd_alert.message,
          timestamp: Date.now(),
        };

        setPersistentAlert(alertItem);
        setAlertHistory((prev) => [alertItem, ...prev].slice(0, 15));
        setMapAlerts((prev) => [
          ...prev,
          { lat: 13.0827 + (Math.random() - 0.5) * 0.01, lng: 80.2707 + (Math.random() - 0.5) * 0.01, type: 'density' },
        ]);


      }

      if (!shouldUpdateStats) return;

      const isRecording = data.recording || false;

      setStats((prev) => {
        if (prev.recording && !isRecording) {
          setTimeout(() => {
            setLockerOpen(true);
            fetchRecordings();
          }, 500);
        }
        return {
          count: data.count ?? prev.count,
          density: data.density ?? prev.density,
          agitation: data.agitation ?? prev.agitation,
          status: data.status || 'SAFE',
          timestamp: data.timestamp || Date.now(),
          mode: data.mode || 'OPTICAL',
          recording: isRecording,
          predicted_density: data.predicted_density ?? data.density,
          crowd_alert: data.crowd_alert || null,
          pressure_index: data.pressure_index ?? prev.pressure_index,
          capacity_pct: data.capacity_pct ?? prev.capacity_pct,
          max_capacity: data.max_capacity ?? 200,
          avg_velocity: data.avg_velocity ?? prev.avg_velocity,
          time_to_critical: data.time_to_critical ?? -1,
          stampede_risk: data.stampede_risk ?? prev.stampede_risk,
          flow_direction: data.flow_direction || prev.flow_direction,
          sectors: data.sectors || prev.sectors,
          wifi_probe_count: data.wifi_probe_count ?? prev.wifi_probe_count,
          wifi_zones: data.wifi_zones || prev.wifi_zones,
          temperature: data.temperature ?? prev.temperature,
          humidity: data.humidity ?? prev.humidity,
          noise_db: data.noise_db ?? prev.noise_db,
          motion_detected: data.motion_detected ?? prev.motion_detected,
          sensor_health: data.sensor_health ?? prev.sensor_health,
          sensor_timestamp: data.sensor_timestamp ?? prev.sensor_timestamp,
          buzzer_state: data.buzzer_state ?? prev.buzzer_state,
          led_state: data.led_state ?? prev.led_state,
          hardware_status: data.hardware_status ?? prev.hardware_status,
          environment_risk: data.environment_risk ?? prev.environment_risk,
          fusion_confidence: data.fusion_confidence ?? prev.fusion_confidence,
          sensor_score: data.sensor_score ?? prev.sensor_score,
          heat_stress_index: data.heat_stress_index ?? prev.heat_stress_index,
          noise_index: data.noise_index ?? prev.noise_index,
          motion_activity_score: data.motion_activity_score ?? prev.motion_activity_score,
          combined_threat_score: data.combined_threat_score ?? prev.combined_threat_score,
          fusion_narrative: data.fusion_narrative ?? prev.fusion_narrative,
        };
      });

      const zones: Record<string, WifiZone> = data.wifi_zones || {};
      const activeCount = Object.values(zones).filter((z) => z.status === 'ACTIVE').length;
      setActiveWifiZones(activeCount);


    };

    ws.current.onclose = () => {
      setWsConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 10000);
      reconnectAttempt.current += 1;
      reconnectTimer.current = setTimeout(connectWebSocket, delay);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        playSound('click');
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 's':
          if (e.ctrlKey || e.metaKey) return;
          setSosMode((prev) => {
            playSound('alert');
            speakText(!prev ? 'Emergency SOS activated' : 'Emergency SOS deactivated');
            return !prev;
          });
          break;
        case 't':
          sendCommand('set_mode', { mode: stats.mode === 'OPTICAL' ? 'thermal' : 'optical' });
          break;
        case 'r':
          sendCommand(stats.recording ? 'stop_recording' : 'start_recording');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stats.mode, stats.recording]);

  const sendCommand = (action: string, payload: any = {}) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action, ...payload }));
      playSound('click');
    }
  };

  const runHardwareSelfTest = async () => {
    setSelfTestRunning(true);
    playSound('beep');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/hardware/self-test', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSelfTestReport(data);
      }
    } catch {
      // Fallback via WebSocket
      sendCommand('hardware_selftest');
    } finally {
      setSelfTestRunning(false);
      setSelfTestOpen(true);
    }
  };

  const overrideHardwareActuator = async (buzzer: boolean | null, led: string | null) => {
    playSound('click');
    sendCommand('hardware_override', { buzzer, led });
    try {
      await fetch('http://127.0.0.1:8000/api/hardware/actuators/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buzzer, led }),
      });
    } catch {
      // ignore
    }
  };

  const resetHardwareActuators = async () => {
    playSound('click');
    sendCommand('hardware_reset');
    try {
      await fetch('http://127.0.0.1:8000/api/hardware/actuators/reset', { method: 'POST' });
    } catch {
      // ignore
    }
  };

  const handleCameraChange = (cam: string) => {
    if (cam === activeCamera) return;
    playSound('click');
    setActiveCamera(cam);
    speakText(`Switching feed to ${cam}`);
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SAFE':
        return 'text-emerald-400 border-emerald-500/30';
      case 'ELEVATED':
        return 'text-yellow-400 border-yellow-500/30';
      case 'WARNING':
        return 'text-amber-400 border-amber-500/30';
      case 'CRITICAL':
      case 'EVACUATE':
        return 'text-red-400 border-red-500/30';
      default:
        return 'text-zinc-400 border-white/10';
    }
  };

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  if (!splashDone) return <SplashScreen onComplete={handleSplashComplete} />;

  return (
    <div className="min-h-screen tactical-grid-bg text-zinc-100 font-sans flex flex-col antialiased selection:bg-red-500 selection:text-white relative">
      {/* Emergency Full-Screen Flash */}
      {sosMode && (
        <div className="fixed inset-0 pointer-events-none z-[9998] border-4 border-red-500 animate-pulse" />
      )}

      {/* ── Executive Header ── */}
      <Header
        status={sosMode ? 'EVACUATE' : stats.status}
        getStatusColor={getStatusColor}
        wsConnected={wsConnected}
        activeWifiZones={activeWifiZones}
        sosMode={sosMode}
        onToggleSos={() => setSosMode(!sosMode)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenLocker={() => {
          setLockerOpen(true);
          fetchRecordings();
        }}
        onOpenReport={() => setReportOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* ── Main Viewport Container ── */}
      {/* ── Main Viewport Container (Apple × Samsung Design Language) ── */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-6 py-6 lg:px-8 lg:py-8 flex flex-col gap-6">
        {/* 1. KPI Overview (Apple Widgets: People, Density, Flow Velocity, Active Devices) */}
        <StatusCardsRow
          count={stats.count}
          maxCapacity={stats.max_capacity}
          capacityPct={stats.capacity_pct}
          density={stats.density}
          status={sosMode ? 'EVACUATE' : stats.status}
          stampedeRisk={stats.stampede_risk}
          wifiProbeCount={stats.wifi_probe_count}
          activeWifiZones={activeWifiZones}
          avgVelocity={stats.avg_velocity}
        />

        {/* 2. Centerpiece: Large Live Camera Feed (occupying around 45–50% of the dashboard) */}
        <div className="w-full">
          <VideoFeed
            imageRef={imageRef}
            isRecording={stats.recording}
            visionMode={stats.mode}
            activeCamera={activeCamera}
            soundEnabled={soundEnabled}
            status={sosMode ? 'EVACUATE' : stats.status}
            flowDirection={stats.flow_direction}
            sectors={stats.sectors}
            onToggleRecord={() => sendCommand(stats.recording ? 'stop_recording' : 'start_recording')}
            onToggleVision={() =>
              sendCommand('set_mode', { mode: stats.mode === 'OPTICAL' ? 'thermal' : 'optical' })
            }
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onSetGeofence={(points) => sendCommand('set_geofence', { points })}
            onSelectCamera={handleCameraChange}
          />
        </div>

        {/* 3. Operational Intelligence & Telemetry: Risk, AI Summary, Environment, Hardware */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
          {/* Card 1: Risk Analysis (Large circular activity ring, 18/100, SAFE, 94% confidence, reason) */}
          <RiskGauge
            risk={stats.stampede_risk}
            status={sosMode ? 'EVACUATE' : stats.status}
            environmentRisk={stats.environment_risk}
            combinedThreatScore={stats.combined_threat_score}
            fusionConfidence={stats.fusion_confidence}
          />

          {/* Card 2: AI Summary Card (Apple Health insights bullet points, horizon toggle) */}
          <AIInsightsCard
            density={stats.density}
            stampedeRisk={stats.stampede_risk}
            timeToCritical={stats.time_to_critical}
            status={stats.status}
            fusionNarrative={stats.fusion_narrative}
            fusionConfidence={stats.fusion_confidence}
          />

          {/* Card 3: Environmental Card (Temp, Humidity, Noise merged with subtle icons) */}
          <EnvironmentCard
            temperature={stats.temperature}
            humidity={stats.humidity}
            noiseDb={stats.noise_db}
          />

          {/* Card 4: Hardware Card (ESP32 Connected, Latency 24ms, 30 FPS, WiFi Stable, Diagnostics) */}
          <HardwareCard
            hardwareStatus={stats.hardware_status}
            latencyMs={24}
            fps={30}
            onOpenSelfTest={runHardwareSelfTest}
          />
        </div>

        {/* 4. Alerts (✓ No Active Incidents) */}
        <ActiveAlertsPanel activeAlert={persistentAlert} alertHistory={alertHistory} />

        {/* 5. Understated Secondary Operations Tray (Tactical Map & Timeline Scrubber) */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex justify-center">
            <button
              onClick={() => setShowTacticalTray(!showTacticalTray)}
              className="px-4 py-2 rounded-full bg-[#141417] hover:bg-[#1C1C21] text-xs font-medium text-[#B9B9C5] hover:text-white border border-white/[0.05] transition-all flex items-center gap-2"
            >
              <span>{showTacticalTray ? 'Hide Secondary Tactical Tools' : 'Show Secondary Tactical Radar & Incident Timeline'}</span>
              <ChevronDown size={14} className={`transform transition-transform ${showTacticalTray ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showTacticalTray && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              <Timeline currentDensity={stats.density} />
              <div className="h-[280px] card-apple p-4 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                  <span className="text-sm font-medium text-white">Perimeter Radar</span>
                  <span className="text-xs text-[#B9B9C5]">CartoDB Dark Matter</span>
                </div>
                <div className="flex-1 min-h-0 rounded-xl overflow-hidden mt-2">
                  <LiveMap alerts={mapAlerts} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Floating Minimalist AI Assistant Pill ── */}
      <button
        onClick={() => {
          setChatOpen(!chatOpen);
          playSound('click');
        }}
        className="fixed bottom-6 right-6 z-30 bg-[#141417] hover:bg-[#1C1C21] text-white px-4 py-2.5 rounded-full border border-white/[0.08] shadow-2xl flex items-center gap-2.5 transition-all text-xs font-medium"
      >
        <Sparkles size={15} strokeWidth={1.75} className="text-[#00B5FF]" />
        <span>CrowdPulse Assistant</span>
        {chatOpen && <span className="w-1.5 h-1.5 rounded-full bg-[#1ED760]" />}
      </button>

      {/* ── AI Assistant Sidebar ── */}
      <AIChatSidebar
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleChatSubmit={handleChatSubmit}
        chatContainerRef={chatContainerRef}
      />

      {/* ── Evidence Locker Modal ── */}
      <EvidenceLocker
        lockerOpen={lockerOpen}
        setLockerOpen={setLockerOpen}
        recordings={recordings}
        selectedVideo={selectedVideo}
        setSelectedVideo={setSelectedVideo}
      />

      {/* ── Hardware Self-Test Benchmark Modal ── */}
      <HardwareSelfTestModal
        isOpen={selfTestOpen}
        onClose={() => setSelfTestOpen(false)}
        report={selfTestReport}
        isRunning={selfTestRunning}
        onRunTest={runHardwareSelfTest}
        onOverrideActuator={overrideHardwareActuator}
      />

      {/* ── Forensic Incident Audit Report Modal ── */}
      <ForensicReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        stats={stats}
        activeCamera={activeCamera}
        imageRef={imageRef}
        alertHistory={alertHistory}
      />

      {/* ── Operational Command Palette (Ctrl+K) ── */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectCamera={handleCameraChange}
        onToggleVision={() => sendCommand('set_mode', { mode: stats.mode === 'OPTICAL' ? 'thermal' : 'optical' })}
        onOpenReport={() => setReportOpen(true)}
        onOpenSelfTest={runHardwareSelfTest}
        onOpenVault={() => {
          setLockerOpen(true);
          fetchRecordings();
        }}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onToggleSos={() => {
          setSosMode((prev) => {
            playSound('alert');
            speakText(!prev ? 'Emergency SOS activated' : 'Emergency SOS deactivated');
            return !prev;
          });
        }}
        onSnapshot={() => playSound('beep')}
        onPulseBuzzer={() => {
          overrideHardwareActuator(true, 'RED');
          setTimeout(() => overrideHardwareActuator(false, 'GREEN'), 3000);
        }}
        onPoliceLed={() => overrideHardwareActuator(null, 'POLICE')}
        onResetActuators={resetHardwareActuators}
      />
    </div>
  );
}

export default App;
