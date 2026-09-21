import React from "react";
import { evaluateIsoSeverity } from "../utils/vibrationAnalysis";
import { Zap, ShieldAlert, Waves, Gauge } from "lucide-react";

interface Props {
  currentRms: number;
  peakMagnitude: number;
  dominantFrequency: number;
  kurtosis: number;
}

export const MetricCards: React.FC<Props> = ({
  currentRms,
  peakMagnitude,
  dominantFrequency,
  kurtosis,
}) => {
  const iso = evaluateIsoSeverity(currentRms);
  const crestFactor = currentRms > 0.05 ? peakMagnitude / currentRms : 1.0;
  const gForce = peakMagnitude / 9.80665;

  return (
    <div id="metric-cards-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. RMS Vibration & ISO 10816 */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-500">실효 진동 (RMS)</span>
          <Gauge className="w-4 h-4 text-cyan-600" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight">
            {currentRms.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-slate-500">m/s²</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded font-mono"
            style={{
              backgroundColor: `${iso.color}15`,
              color: iso.color === "#ef4444" ? "#b91c1c" : iso.color === "#f59e0b" ? "#b45309" : "#047857",
              border: `1px solid ${iso.color}40`,
            }}
          >
            {iso.class}
          </span>
          <span className="text-[11px] font-mono text-slate-500">{iso.status}</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${Math.min(100, (currentRms / 8.0) * 100)}%`,
              backgroundColor: iso.color,
            }}
          />
        </div>
      </div>

      {/* 2. Peak Magnitude & G-Force */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-500">최대 첨두치 (Peak)</span>
          <Zap className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight">
            {peakMagnitude.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-slate-500">m/s²</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
          <span className="text-amber-700 font-semibold">{gForce.toFixed(2)} G</span>
          <span className="text-slate-400">충격 한계 16G</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-100"
            style={{ width: `${Math.min(100, (peakMagnitude / 25.0) * 100)}%` }}
          />
        </div>
      </div>

      {/* 3. Dominant Frequency & Crest Factor */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-500">주 진동수 (Peak Freq)</span>
          <Waves className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight">
            {dominantFrequency.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-500">Hz</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">
            크레스트 팩터:{" "}
            <span
              className={`font-semibold ${
                crestFactor > 3.8 ? "text-rose-600" : "text-slate-800"
              }`}
            >
              {crestFactor.toFixed(1)}
            </span>
          </span>
          <span className="text-slate-400">{crestFactor > 3.8 ? "충격파" : "정현파"}</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${Math.min(100, (dominantFrequency / 60.0) * 100)}%` }}
          />
        </div>
      </div>

      {/* 4. Kurtosis (Crack/Impact Indicator) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-500">첨도 지수 (Kurtosis)</span>
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight">
            {kurtosis.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-slate-500">kt</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
          <span
            className={`font-semibold ${
              kurtosis > 4.5
                ? "text-rose-600"
                : kurtosis > 3.5
                ? "text-amber-600"
                : "text-emerald-700"
            }`}
          >
            {kurtosis > 4.5 ? "이상 충격" : kurtosis > 3.5 ? "주의 요망" : "정규 분포"}
          </span>
          <span className="text-slate-400">기준: 3.0</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              kurtosis > 4.5 ? "bg-rose-500" : kurtosis > 3.5 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, (kurtosis / 8.0) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
