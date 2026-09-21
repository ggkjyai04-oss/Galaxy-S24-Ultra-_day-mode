import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  VibrationSample,
  AnomalyEvent,
  SensorConfig,
  SimulationScenario,
  OperationMode,
} from "./types";
import { calculateKurtosis, evaluateIsoSeverity } from "./utils/vibrationAnalysis";
import { alertManager } from "./utils/alerts";
import { OscilloscopeCanvas } from "./components/OscilloscopeCanvas";
import { SpectralView } from "./components/SpectralView";
import { MetricCards } from "./components/MetricCards";
import { SimulationController } from "./components/SimulationController";
import { AnomalyAlertPanel } from "./components/AnomalyAlertPanel";
import { DeviceConnectorModal } from "./components/DeviceConnectorModal";
import { GeminiDiagnosisModal } from "./components/GeminiDiagnosisModal";
import { SettingsModal } from "./components/SettingsModal";
import { SensorNodeMobileView } from "./components/SensorNodeMobileView";

import {
  Smartphone,
  Activity,
  Settings,
  QrCode,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  ShieldAlert,
  Brain,
  Download,
} from "lucide-react";

export default function App() {
  // Navigation & Mode
  const [mode, setMode] = useState<OperationMode>("DASHBOARD");

  // Check URL query parameters for ?mode=sensor on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "sensor") {
        setMode("SENSOR");
      }
    }
  }, []);

  // Sensor Settings / Thresholds
  const [config, setConfig] = useState<SensorConfig>({
    sampleRate: 60,
    removeGravity: true,
    rmsWarningThreshold: 2.8,
    rmsCriticalThreshold: 5.5,
    peakWarningThreshold: 6.0,
    peakCriticalThreshold: 14.0,
    kurtosisThreshold: 4.5,
    audioAlarmEnabled: true,
    hapticEnabled: true,
    browserNotifyEnabled: false,
    autoAiDiagnosis: false,
  });

  // Telemetry buffer & Anomaly logs
  const [samples, setSamples] = useState<VibrationSample[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [activeAlert, setActiveAlert] = useState<AnomalyEvent | null>(null);

  // Modals state
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [diagnosisTargetAnomaly, setDiagnosisTargetAnomaly] = useState<AnomalyEvent | null>(null);

  // Audio mute
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Simulator controls
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [scenario, setScenario] = useState<SimulationScenario>("NORMAL_STABLE");
  const [isRemoteConnected, setIsRemoteConnected] = useState<boolean>(false);

  // Simulation state variables
  const simPhaseRef = useRef<number>(0);
  const spikeMagnitudeRef = useRef<number>(0);
  const lastAlertTimeRef = useRef<number>(0);

  // Toggle audio mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    alertManager.setMuted(next);
  };

  // Connect to backend SSE stream for remote Galaxy S24 Ultra data
  useEffect(() => {
    const eventSource = new EventSource("/api/stream");

    eventSource.addEventListener("init", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.recentSamples && data.recentSamples.length > 0) {
          setSamples(data.recentSamples);
        }
        if (data.anomalies && data.anomalies.length > 0) {
          setAnomalies(data.anomalies);
        }
      } catch (err) {
        console.warn("SSE init error:", err);
      }
    });

    eventSource.addEventListener("vibration_batch", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.samples && data.samples.length > 0) {
          setIsRemoteConnected(true);
          setSamples((prev) => [...prev.slice(-250), ...data.samples]);
        }
      } catch (err) {
        console.warn("SSE vibration_batch error:", err);
      }
    });

    eventSource.addEventListener("anomaly", (e) => {
      try {
        const data: AnomalyEvent = JSON.parse(e.data);
        setAnomalies((prev) => [data, ...prev.slice(0, 50)]);
        setActiveAlert(data);
        if (config.audioAlarmEnabled) {
          if (data.severity === "CRITICAL") {
            alertManager.triggerCriticalAlert();
          } else {
            alertManager.playWarningTone();
          }
        }
      } catch (err) {
        console.warn("SSE anomaly error:", err);
      }
    });

    eventSource.addEventListener("anomaly_ack", (e) => {
      try {
        const { id } = JSON.parse(e.data);
        setAnomalies((prev) =>
          prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
        );
        setActiveAlert((cur) => (cur && cur.id === id ? null : cur));
      } catch {}
    });

    eventSource.addEventListener("anomaly_clear", () => {
      setAnomalies([]);
      setActiveAlert(null);
    });

    eventSource.onerror = () => {
      setIsRemoteConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [config.audioAlarmEnabled]);

  // Inject immediate spike shock
  const handleInjectSpike = () => {
    spikeMagnitudeRef.current = 28.5; // 28.5 m/s² sharp shock
  };

  // Continuous physics / simulation engine (runs at ~50-60Hz)
  useEffect(() => {
    if (!isSimulating || mode === "SENSOR") return;

    const interval = setInterval(() => {
      simPhaseRef.current += 0.1;
      const t = simPhaseRef.current;
      const now = Date.now();

      let dynamicX = 0;
      let dynamicY = 0;
      let dynamicZ = 0;
      let dominantFreq = 15.0;

      // Base random MEMS noise floor of Galaxy S24 Ultra (ultra-low noise ~0.1 m/s²)
      const noiseX = (Math.random() - 0.5) * 0.25;
      const noiseY = (Math.random() - 0.5) * 0.25;
      const noiseZ = (Math.random() - 0.5) * 0.25;

      switch (scenario) {
        case "NORMAL_STABLE":
          dynamicX = noiseX;
          dynamicY = noiseY;
          dynamicZ = noiseZ;
          dominantFreq = 12.0;
          break;

        case "MOTOR_IMBALANCE": {
          // 30Hz sinusoidal rotation vibration (e.g. 1800 RPM motor unbalance)
          const f = 30.0;
          dominantFreq = f;
          const amp = 4.2;
          dynamicX = amp * Math.sin(t * f * 0.2) + noiseX * 1.5;
          dynamicY = amp * Math.cos(t * f * 0.2) + noiseY * 1.5;
          dynamicZ = amp * 0.3 * Math.sin(t * f * 0.4) + noiseZ;
          break;
        }

        case "BEARING_FAULT": {
          // High-frequency repetitive impact spikes (BPFO / BPFI bearing ball pass defect)
          dominantFreq = 48.0;
          const isImpulse = Math.sin(t * 12) > 0.92;
          const burstAmp = isImpulse ? 8.5 * (0.8 + Math.random() * 0.4) : 0.8;
          dynamicX = burstAmp * Math.sin(t * 48 * 0.2) + noiseX * 2.0;
          dynamicY = burstAmp * 0.6 * Math.cos(t * 48 * 0.2) + noiseY * 2.0;
          dynamicZ = burstAmp * 0.8 * Math.sin(t * 24 * 0.2) + noiseZ * 2.0;
          break;
        }

        case "SEISMIC_TREMOR": {
          // Low-frequency 2.5Hz high-displacement sway
          dominantFreq = 2.5;
          const envelope = 1.0 + 0.6 * Math.sin(t * 0.3);
          const amp = 5.8 * envelope;
          dynamicX = amp * Math.sin(t * 2.5 * 0.5) + noiseX;
          dynamicY = amp * 0.7 * Math.cos(t * 2.5 * 0.5) + noiseY;
          dynamicZ = amp * 0.4 * Math.sin(t * 5.0 * 0.5) + noiseZ;
          break;
        }

        case "IMPACT_SHOCK": {
          // Continuous irregular shocks
          dominantFreq = 35.0;
          const shock = Math.random() > 0.88 ? 16.0 * Math.random() : 0.5;
          dynamicX = shock + noiseX * 3;
          dynamicY = shock * 0.8 + noiseY * 3;
          dynamicZ = shock * 0.5 + noiseZ * 3;
          break;
        }
      }

      // Add manual injected spike if triggered
      if (spikeMagnitudeRef.current > 0.05) {
        dynamicX += spikeMagnitudeRef.current * 0.8;
        dynamicY += spikeMagnitudeRef.current * 0.6;
        dynamicZ += spikeMagnitudeRef.current * 0.5;
        spikeMagnitudeRef.current *= 0.75; // exponential decay
      }

      const filteredMag = Math.sqrt(
        dynamicX * dynamicX + dynamicY * dynamicY + dynamicZ * dynamicZ
      );

      setSamples((prev) => {
        const windowSamples = prev.slice(-30).map((s) => s.filteredMagnitude);
        windowSamples.push(filteredMag);

        // Rolling RMS
        let sumSq = 0;
        for (const val of windowSamples) sumSq += val * val;
        const rms = Math.sqrt(sumSq / windowSamples.length);
        const kurtosis = calculateKurtosis(windowSamples);

        const newSample: VibrationSample = {
          timestamp: now,
          x: dynamicX,
          y: dynamicY,
          z: dynamicZ,
          magnitude: Math.sqrt(
            (dynamicX + 9.8) * (dynamicX + 9.8) + dynamicY * dynamicY + dynamicZ * dynamicZ
          ),
          filteredMagnitude: filteredMag,
          rms,
          peakToPeak: filteredMag * 1.9,
          frequency: dominantFreq,
          kurtosis,
        };

        // Check for anomalies
        if (now - lastAlertTimeRef.current > 1800) {
          let anomaly: AnomalyEvent | null = null;

          if (
            filteredMag >= config.peakCriticalThreshold ||
            rms >= config.rmsCriticalThreshold
          ) {
            anomaly = {
              id: `anom-${now}`,
              timestamp: now,
              deviceId: "Galaxy S24 Ultra (Simulated)",
              type:
                filteredMag > config.peakCriticalThreshold
                  ? "IMPACT_SHOCK"
                  : "SUSTAINED_HIGH_RMS",
              severity: "CRITICAL",
              magnitude: filteredMag,
              rms,
              dominantFreq,
              description: `위험 수준 진동 초과 (${filteredMag.toFixed(2)} m/s²)`,
            };
          } else if (
            filteredMag >= config.peakWarningThreshold ||
            rms >= config.rmsWarningThreshold
          ) {
            anomaly = {
              id: `anom-${now}`,
              timestamp: now,
              deviceId: "Galaxy S24 Ultra (Simulated)",
              type: "SPIKE",
              severity: "WARNING",
              magnitude: filteredMag,
              rms,
              dominantFreq,
              description: `주의 수준 진동 감지 (${filteredMag.toFixed(2)} m/s²)`,
            };
          }

          if (anomaly) {
            lastAlertTimeRef.current = now;
            setAnomalies((a) => [anomaly!, ...a.slice(0, 50)]);
            setActiveAlert(anomaly);

            if (config.audioAlarmEnabled) {
              if (anomaly.severity === "CRITICAL") {
                alertManager.triggerCriticalAlert();
              } else {
                alertManager.playWarningTone();
              }
            }
            if (config.hapticEnabled) {
              alertManager.triggerHaptic(anomaly.severity);
            }
            if (config.browserNotifyEnabled) {
              alertManager.sendBrowserNotification(
                `🚨 [${anomaly.severity}] Galaxy S24 Ultra 진동 이상!`,
                `${anomaly.description} - RMS: ${anomaly.rms.toFixed(2)} m/s²`
              );
            }

            // Sync with backend
            fetch("/api/sensor/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceId: "Galaxy S24 Ultra",
                anomaly,
              }),
            }).catch(() => {});
          }
        }

        const next = [...prev, newSample];
        if (next.length > 200) next.shift();
        return next;
      });
    }, 1000 / 50);

    return () => clearInterval(interval);
  }, [isSimulating, scenario, mode, config]);

  // Compute latest snapshot metrics
  const latestSample = samples[samples.length - 1];
  const currentRms = latestSample ? latestSample.rms : 0;
  const peakMagnitude = latestSample
    ? Math.max(...samples.slice(-30).map((s) => s.filteredMagnitude), 0)
    : 0;
  const dominantFrequency = latestSample ? latestSample.frequency : 0;
  const currentKurtosis = latestSample?.kurtosis || 3.0;

  // Acknowledge anomaly
  const handleAcknowledge = async (id: string) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    if (activeAlert?.id === id) {
      setActiveAlert(null);
    }
    alertManager.stopContinuousAlarm();
    try {
      await fetch("/api/anomaly/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {}
  };

  // Clear all anomalies
  const handleClearLogs = async () => {
    setAnomalies([]);
    setActiveAlert(null);
    alertManager.stopContinuousAlarm();
    try {
      await fetch("/api/anomaly/clear", { method: "POST" });
    } catch {}
  };

  // Switch to native Galaxy S24 Ultra mobile mode
  if (mode === "SENSOR") {
    return (
      <SensorNodeMobileView
        onBackToDashboard={() => setMode("DASHBOARD")}
        warningThreshold={config.rmsWarningThreshold}
        criticalThreshold={config.rmsCriticalThreshold}
      />
    );
  }

  return (
    <div id="vibration-monitoring-app" className="min-h-screen bg-slate-100 text-slate-800 flex flex-col antialiased selection:bg-cyan-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Device Tag */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  Galaxy S24 Ultra 진동 센서 이상 감지 시스템
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold">
                  v2.4 Day Mode Sentinel
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                삼성 갤S24U 6축 MEMS 가속도계 기반 실시간 이상 징후 분석 & AI 진단
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            {/* Remote Status Badge */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border font-mono ${
                isRemoteConnected
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <Wifi className={`w-3.5 h-3.5 ${isRemoteConnected ? "text-emerald-600 animate-pulse" : ""}`} />
              <span className="hidden md:inline">
                {isRemoteConnected ? "Galaxy S24 Ultra 원격 수신 중" : "로컬 시뮬레이터 가동"}
              </span>
            </div>

            {/* Galaxy S24 Ultra QR link modal button */}
            <button
              id="open-qr-connect-btn"
              onClick={() => setIsQrModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium rounded-lg flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>갤럭시 기기 연동 (QR)</span>
            </button>

            {/* Standalone Single HTML Download button */}
            <a
              id="download-standalone-html-btn"
              href="/api/download-standalone-html"
              download="galaxy_s24_ultra_vibration_monitor.html"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg flex items-center space-x-1.5 border border-slate-300 transition-colors shadow-xs"
              title="인터넷/서버 없이 브라우저에서 단독 실행 가능한 단일 .html 파일 다운로드"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600" />
              <span>단일 .html 다운로드</span>
            </a>

            {/* Direct Sensor Mode Switch */}
            <button
              id="switch-sensor-mode-btn"
              onClick={() => setMode("SENSOR")}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg flex items-center space-x-1.5 border border-slate-300 transition-colors hidden sm:flex shadow-xs"
              title="이 기기를 갤럭시 S24 울트라 센서 송신기로 전환"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
              <span>센서 송신 모드</span>
            </button>

            {/* Audio Mute toggle */}
            <button
              id="audio-mute-toggle-btn"
              onClick={toggleMute}
              className={`p-2 rounded-lg border transition-colors ${
                isMuted
                  ? "bg-slate-100 text-slate-400 border-slate-300"
                  : "bg-cyan-50 text-cyan-700 border-cyan-200"
              }`}
              title={isMuted ? "경보음 켜기" : "경보음 음소거"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Settings button */}
            <button
              id="open-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-xs"
              title="임계치 및 센서 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards (RMS, Peak, Freq, Kurtosis) */}
        <MetricCards
          currentRms={currentRms}
          peakMagnitude={peakMagnitude}
          dominantFrequency={dominantFrequency}
          kurtosis={currentKurtosis}
        />

        {/* Oscilloscope Waveform and Frequency Spectrum */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OscilloscopeCanvas
              samples={samples}
              warningThreshold={config.rmsWarningThreshold}
              criticalThreshold={config.rmsCriticalThreshold}
            />
          </div>
          <div>
            <SpectralView samples={samples} sampleRate={config.sampleRate} />
          </div>
        </div>

        {/* Simulation Scenario & Spike Injection Controls */}
        <SimulationController
          currentScenario={scenario}
          onSelectScenario={(sc) => setScenario(sc)}
          onInjectSpike={handleInjectSpike}
          isSimulating={isSimulating}
          onToggleSimulation={() => setIsSimulating((s) => !s)}
        />

        {/* Real-time Anomaly Alerts Feed & AI Diagnostics */}
        <AnomalyAlertPanel
          anomalies={anomalies}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onClearLogs={handleClearLogs}
          onAcknowledge={handleAcknowledge}
          onRequestDiagnosis={(anomaly) => setDiagnosisTargetAnomaly(anomaly)}
          activeAlert={activeAlert}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            Samsung Galaxy S24 Ultra MEMS Vibration Intelligence Platform (Day Mode)
          </span>
          <span className="text-slate-400">
            ISO 10816 Mechanical Severity Standards & Google Gemini Diagnostics
          </span>
        </div>
      </footer>

      {/* Modals */}
      <DeviceConnectorModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSwitchToSensorMode={() => setMode("SENSOR")}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={(c) => setConfig(c)}
      />

      <GeminiDiagnosisModal
        anomaly={diagnosisTargetAnomaly}
        isOpen={Boolean(diagnosisTargetAnomaly)}
        onClose={() => setDiagnosisTargetAnomaly(null)}
        recentAvgRms={currentRms}
        recentPeak={peakMagnitude}
      />
    </div>
  );
}
