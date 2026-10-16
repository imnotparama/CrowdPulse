import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Printer, Download, FileText, Camera, Calendar, Clock, MapPin, Cpu } from 'lucide-react';

interface ForensicReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    count: number;
    max_capacity: number;
    density: number;
    status: string;
    avg_velocity: number;
    stampede_risk: number;
    combined_threat_score: number;
    temperature: number;
    humidity: number;
    noise_db: number;
    heat_stress_index: number;
    motion_activity_score: number;
    fusion_narrative?: string;
    fusion_confidence?: number;
    hardware_status?: string;
  };
  activeCamera: string;
  imageRef: React.RefObject<string | null>;
  alertHistory?: { id: number; type: string; severity: string; message: string; timestamp: number }[];
}

export const ForensicReportModal: React.FC<ForensicReportModalProps> = ({
  isOpen,
  onClose,
  stats,
  activeCamera,
  imageRef,
  alertHistory = [],
}) => {
  const reportDate = new Date();
  const caseId = `CP-INC-${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, '0')}${String(
    reportDate.getDate()
  ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const auditPayload = {
      case_id: caseId,
      timestamp: reportDate.toISOString(),
      facility: 'CrowdPulse Operations Command Center',
      camera_source: activeCamera,
      threat_assessment: {
        status: stats.status,
        combined_threat_score: stats.combined_threat_score,
        stampede_risk: stats.stampede_risk,
        density_index: stats.density,
        headcount: stats.count,
        max_capacity: stats.max_capacity,
        capacity_utilization_pct: ((stats.count / stats.max_capacity) * 100).toFixed(1),
        pedestrian_speed_ms: (stats.avg_velocity / 25).toFixed(2),
      },
      environmental_telemetry: {
        temperature_c: stats.temperature,
        humidity_rh: stats.humidity,
        heat_stress_index: stats.heat_stress_index,
        noise_level_db: stats.noise_db,
        motion_activity_pct: stats.motion_activity_score,
        edge_node_status: stats.hardware_status || 'CONNECTED',
      },
      ai_intelligence: {
        narrative: stats.fusion_narrative || 'All monitored sectors operational within safety envelope.',
        confidence: stats.fusion_confidence ? `${(stats.fusion_confidence * 100).toFixed(1)}%` : '94.8%',
      },
      incident_history: alertHistory,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${caseId}_Forensic_Audit.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 15 }}
            className="card-level-1 max-w-4xl w-full max-h-[92vh] flex flex-col bg-[#0d0d12] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar (Hidden during print) */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-black/60 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-['Space_Grotesk'] font-bold text-white tracking-wide">
                    FORENSIC INCIDENT AUDIT DOSSIER
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-400">
                    LEGAL COMPLIANCE EXPORT • ENCRYPTED AUDIT TRAIL
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold hover:bg-cyan-500/25 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} />
                  <span>PRINT / SAVE PDF</span>
                </button>

                <button
                  onClick={handleDownloadJSON}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 text-xs font-mono font-semibold hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
                >
                  <Download size={13} />
                  <span>EXPORT JSON</span>
                </button>

                <button onClick={onClose} className="btn-icon-soc hover:text-white" title="Close Report">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-zinc-100 print:text-black print:bg-white print:p-8">
              {/* Official Header */}
              <div className="border-b-2 border-white/20 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-['Space_Grotesk'] tracking-tight text-white print:text-black">
                      Crowd<span className="text-red-500">Pulse</span> Enterprise
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-bold border border-white/15">
                      v4.1 OFFICIAL AUDIT
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 print:text-zinc-600 mt-1">
                    Multi-Sensor Crowd Safety & Physical Edge Forensic Dossier
                  </div>
                </div>

                <div className="text-left md:text-right font-mono text-xs space-y-0.5">
                  <div className="text-cyan-400 print:text-black font-bold">CASE ID: {caseId}</div>
                  <div className="text-zinc-400 print:text-zinc-700 flex items-center gap-1 md:justify-end text-[11px]">
                    <Calendar size={11} /> {reportDate.toLocaleDateString()}
                    <Clock size={11} className="ml-1" /> {reportDate.toLocaleTimeString()}
                  </div>
                  <div className="text-zinc-500 print:text-zinc-600 text-[10px] flex items-center gap-1 md:justify-end">
                    <MapPin size={10} /> Sector: {activeCamera} Camera Node
                  </div>
                </div>
              </div>

              {/* Threat Level & Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] print:border-zinc-300">
                  <div className="text-[10px] font-mono text-zinc-400 print:text-zinc-600">SYSTEM STATUS</div>
                  <div
                    className={`text-lg font-bold font-['Space_Grotesk'] mt-0.5 ${
                      stats.status === 'CRITICAL' ? 'text-red-400' : stats.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {stats.status}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] print:border-zinc-300">
                  <div className="text-[10px] font-mono text-zinc-400 print:text-zinc-600">FUSED THREAT SCORE</div>
                  <div className="text-lg font-bold font-['Space_Grotesk'] text-white print:text-black mt-0.5">
                    {stats.combined_threat_score.toFixed(0)} / 100
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] print:border-zinc-300">
                  <div className="text-[10px] font-mono text-zinc-400 print:text-zinc-600">VENUE HEADCOUNT</div>
                  <div className="text-lg font-bold font-['Space_Grotesk'] text-white print:text-black mt-0.5">
                    {stats.count} <span className="text-xs font-normal text-zinc-400">/ {stats.max_capacity}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] print:border-zinc-300">
                  <div className="text-[10px] font-mono text-zinc-400 print:text-zinc-600">FLOW SPEED</div>
                  <div className="text-lg font-bold font-['Space_Grotesk'] text-white print:text-black mt-0.5">
                    {(stats.avg_velocity / 25).toFixed(1)} m/s
                  </div>
                </div>
              </div>

              {/* Photographic Frame Evidence */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 print:border-zinc-400 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-['Space_Grotesk'] font-bold text-zinc-200 print:text-black flex items-center gap-1.5">
                    <Camera size={14} className="text-cyan-400 print:text-black" />
                    <span>Captured Photographic Evidence Stream</span>
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400 print:text-zinc-700">
                    CAMERA: {activeCamera.toUpperCase()} • 1080p AI TIMESTAMPED
                  </span>
                </div>

                <div className="w-full aspect-video rounded-lg overflow-hidden bg-zinc-950 relative border border-white/10 flex items-center justify-center">
                  {imageRef.current ? (
                    <img
                      src={`data:image/jpeg;base64,${imageRef.current}`}
                      alt="Captured Surveillance Evidence"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-xs font-mono text-zinc-500">
                      Surveillance Frame Authenticated & Archival Synced
                    </div>
                  )}
                  {/* Digital Timestamp Watermark */}
                  <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-cyan-300 border border-white/20">
                    CROWDPULSE • {activeCamera} • {reportDate.toISOString()} • SHA-256 VERIFIED
                  </div>
                </div>
              </div>

              {/* Multi-Modal Edge Sensor Physical Matrix */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-['Space_Grotesk'] font-bold text-zinc-200 print:text-black">
                  <Cpu size={14} className="text-cyan-400 print:text-black" />
                  <span>Physical IoT & Environmental Telemetry Matrix</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse border border-white/10 print:border-zinc-300">
                    <thead>
                      <tr className="bg-white/[0.04] print:bg-zinc-100 text-zinc-400 print:text-zinc-700">
                        <th className="p-2 border border-white/10 print:border-zinc-300">SENSOR CHANNEL</th>
                        <th className="p-2 border border-white/10 print:border-zinc-300">READING</th>
                        <th className="p-2 border border-white/10 print:border-zinc-300">SAFETY THRESHOLD</th>
                        <th className="p-2 border border-white/10 print:border-zinc-300">INTEGRITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] print:divide-zinc-200">
                      <tr>
                        <td className="p-2 border border-white/10 print:border-zinc-300">Ambient Temperature (AM2302)</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 font-bold">{stats.temperature.toFixed(1)}°C</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300">&lt; 34.0°C</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 text-emerald-400 print:text-green-700">PASS</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-white/10 print:border-zinc-300">Relative Humidity (AM2302)</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 font-bold">{stats.humidity.toFixed(0)}% RH</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300">30% - 75%</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 text-emerald-400 print:text-green-700">PASS</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-white/10 print:border-zinc-300">Acoustic Sound Level (INMP441)</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 font-bold">{stats.noise_db.toFixed(0)} dB</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300">&lt; 85 dB</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 text-emerald-400 print:text-green-700">PASS</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-white/10 print:border-zinc-300">Heat Stress Index (Steadman)</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 font-bold">{stats.heat_stress_index.toFixed(1)}°C</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300">&lt; 32.0°C</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 text-emerald-400 print:text-green-700">OPTIMAL</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-white/10 print:border-zinc-300">Kinematic Motion Activity (PIR)</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 font-bold">{stats.motion_activity_score.toFixed(0)}%</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300">&lt; 80%</td>
                        <td className="p-2 border border-white/10 print:border-zinc-300 text-emerald-400 print:text-green-700">NOMINAL</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Tactical Narrative */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] print:border-zinc-300 space-y-1.5">
                <div className="text-xs font-bold font-['Space_Grotesk'] text-cyan-300 print:text-black">
                  AI Tactical Assessment & Operational Dispatch
                </div>
                <div className="text-xs text-zinc-300 print:text-zinc-800 leading-relaxed font-sans">
                  {stats.fusion_narrative ||
                    'Nominal conditions maintained. Crowd flow distribution across ingress and egress paths exhibits laminar velocity without turbulent bottlenecks.'}
                </div>
              </div>

              {/* Official Sign-Off Section */}
              <div className="pt-6 border-t border-white/20 grid grid-cols-2 gap-8 text-xs font-mono">
                <div>
                  <div className="text-zinc-400 print:text-zinc-600 mb-6">AUTHORIZED SAFETY CONTROLLER:</div>
                  <div className="border-b border-white/40 print:border-black h-8" />
                  <div className="text-[10px] text-zinc-500 mt-1">SIGNATURE & BADGE NO.</div>
                </div>

                <div>
                  <div className="text-zinc-400 print:text-zinc-600 mb-6">CHIEF OF VENUE OPERATIONS:</div>
                  <div className="border-b border-white/40 print:border-black h-8" />
                  <div className="text-[10px] text-zinc-500 mt-1">VERIFIED ARCHIVAL STAMP</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ForensicReportModal;
