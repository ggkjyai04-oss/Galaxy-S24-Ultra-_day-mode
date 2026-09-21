import React, { useEffect, useRef, useState } from "react";
import { VibrationSample } from "../types";
import { Activity, Maximize2 } from "lucide-react";

interface Props {
  samples: VibrationSample[];
  warningThreshold: number;
  criticalThreshold: number;
}

export const OscilloscopeCanvas: React.FC<Props> = ({
  samples,
  warningThreshold,
  criticalThreshold,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [scaleRange, setScaleRange] = useState<number>(15); // m/s² max range
  const [activeChannels, setActiveChannels] = useState<{
    x: boolean;
    y: boolean;
    z: boolean;
    mag: boolean;
  }>({
    x: true,
    y: true,
    z: true,
    mag: true,
  });

  // Auto resize canvas to container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * window.devicePixelRatio;
        canvasRef.current.height = rect.height * window.devicePixelRatio;
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Draw continuous 60fps waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, width, height);

    // Background Grid
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1 * dpr;

    // Horizontal grid lines
    const gridDivisionsY = 6;
    for (let i = 0; i <= gridDivisionsY; i++) {
      const y = (height / gridDivisionsY) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const gridDivisionsX = 8;
    for (let i = 0; i <= gridDivisionsX; i++) {
      const x = (width / gridDivisionsX) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Center Baseline (0 m/s²)
    const centerY = height / 2;
    ctx.strokeStyle = "#94a3b8";
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Threshold lines (+/- warning, +/- critical)
    const pxPerUnit = (height / 2) / scaleRange;

    // Warning Threshold
    if (warningThreshold <= scaleRange) {
      const warnYPos = centerY - warningThreshold * pxPerUnit;
      const warnYNeg = centerY + warningThreshold * pxPerUnit;
      ctx.strokeStyle = "rgba(217, 119, 6, 0.85)"; // amber-600
      ctx.setLineDash([2 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(0, warnYPos);
      ctx.lineTo(width, warnYPos);
      ctx.moveTo(0, warnYNeg);
      ctx.lineTo(width, warnYNeg);
      ctx.stroke();
    }

    // Critical Threshold
    if (criticalThreshold <= scaleRange) {
      const critYPos = centerY - criticalThreshold * pxPerUnit;
      const critYNeg = centerY + criticalThreshold * pxPerUnit;
      ctx.strokeStyle = "rgba(220, 38, 38, 0.85)"; // red-600
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(0, critYPos);
      ctx.lineTo(width, critYPos);
      ctx.moveTo(0, critYNeg);
      ctx.lineTo(width, critYNeg);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // No samples state
    if (samples.length < 2) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${13 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("센서 데이터 대기 중...", width / 2, height / 2);
      return;
    }

    // Window of samples to display across canvas width
    const displayWindow = samples.slice(-150);
    const count = displayWindow.length;
    const stepX = width / (count - 1);

    // Draw Channel Function
    const drawChannel = (
      getValue: (s: VibrationSample) => number,
      color: string,
      lineWidth: number
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * dpr;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      for (let i = 0; i < count; i++) {
        const val = getValue(displayWindow[i]);
        // Clamping inside bounds
        const clampedVal = Math.max(-scaleRange * 1.2, Math.min(scaleRange * 1.2, val));
        const x = i * stepX;
        const y = centerY - clampedVal * pxPerUnit;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    // Draw Channels with clear crisp day-mode colors
    if (activeChannels.x) {
      drawChannel((s) => s.x, "#dc2626", 1.8); // Red-600 X-Axis
    }
    if (activeChannels.y) {
      drawChannel((s) => s.y, "#059669", 1.8); // Emerald-600 Y-Axis
    }
    if (activeChannels.z) {
      drawChannel((s) => s.z, "#2563eb", 1.8); // Blue-600 Z-Axis
    }
    if (activeChannels.mag) {
      drawChannel((s) => s.filteredMagnitude, "#d97706", 2.4); // Amber-600 Vector Mag
    }

    // Legend & Scale labels
    ctx.fillStyle = "#475569";
    ctx.font = `600 ${11 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText(`+${scaleRange} m/s²`, 12 * dpr, 20 * dpr);
    ctx.fillText(`0 m/s²`, 12 * dpr, centerY - 6 * dpr);
    ctx.fillText(`-${scaleRange} m/s²`, 12 * dpr, height - 12 * dpr);

    // Latest magnitude readout
    const latest = displayWindow[count - 1];
    if (latest) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#0284c7";
      ctx.font = `bold ${12 * dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText(
        `|VIB| ${latest.filteredMagnitude.toFixed(2)} m/s² (RMS: ${latest.rms.toFixed(2)})`,
        width - 16 * dpr,
        22 * dpr
      );
    }
  }, [samples, scaleRange, activeChannels, warningThreshold, criticalThreshold]);

  return (
    <div id="oscilloscope-container" className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/90 gap-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-600 animate-pulse" />
          <span className="font-semibold text-sm tracking-wide text-slate-900">
            실시간 3축 진동 오실로스코프 (Real-time IMU Waveform)
          </span>
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-white text-cyan-700 border border-slate-200 font-semibold shadow-2xs">
            Galaxy S24 Ultra 60Hz
          </span>
        </div>

        {/* Channel toggles & Range selector */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
            <button
              id="toggle-chan-x"
              type="button"
              onClick={() => setActiveChannels((c) => ({ ...c, x: !c.x }))}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-all ${
                activeChannels.x
                  ? "bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                  : "text-slate-400 line-through hover:text-slate-600"
              }`}
            >
              X 축
            </button>
            <button
              id="toggle-chan-y"
              type="button"
              onClick={() => setActiveChannels((c) => ({ ...c, y: !c.y }))}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-all ${
                activeChannels.y
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                  : "text-slate-400 line-through hover:text-slate-600"
              }`}
            >
              Y 축
            </button>
            <button
              id="toggle-chan-z"
              type="button"
              onClick={() => setActiveChannels((c) => ({ ...c, z: !c.z }))}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-all ${
                activeChannels.z
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                  : "text-slate-400 line-through hover:text-slate-600"
              }`}
            >
              Z 축
            </button>
            <button
              id="toggle-chan-mag"
              type="button"
              onClick={() => setActiveChannels((c) => ({ ...c, mag: !c.mag }))}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-all ${
                activeChannels.mag
                  ? "bg-amber-50 text-amber-800 border border-amber-300 font-bold"
                  : "text-slate-400 line-through hover:text-slate-600"
              }`}
            >
              벡터합 (Mag)
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 mr-1 font-mono">범위:</span>
            {[5, 15, 30, 60].map((range) => (
              <button
                key={range}
                id={`scale-range-${range}`}
                type="button"
                onClick={() => setScaleRange(range)}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                  scaleRange === range
                    ? "bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ±{range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="relative w-full h-64 sm:h-72 cursor-crosshair bg-white">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-mono text-slate-600">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>경고 임계치: {warningThreshold.toFixed(1)} m/s²</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
            <span>위험 임계치: {criticalThreshold.toFixed(1)} m/s²</span>
          </span>
        </div>
        <div className="text-slate-400 hidden sm:block">
          * 중력 가속도(9.8m/s² DC) 자동 보정 제거 필터 적용 중
        </div>
      </div>
    </div>
  );
};
