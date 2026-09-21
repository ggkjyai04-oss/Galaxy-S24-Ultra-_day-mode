import React, { useState, useEffect } from "react";
import { AnomalyEvent, DiagnosisResult } from "../types";
import { Brain, X, ShieldAlert, CheckCircle2, RefreshCw, Wrench, AlertTriangle } from "lucide-react";

interface Props {
  anomaly: AnomalyEvent | null;
  isOpen: boolean;
  onClose: () => void;
  recentAvgRms: number;
  recentPeak: number;
}

export const GeminiDiagnosisModal: React.FC<Props> = ({
  anomaly,
  isOpen,
  onClose,
  recentAvgRms,
  recentPeak,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [equipmentContext, setEquipmentContext] = useState<string>("산업용 회전 모터 및 펌프 설비");
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnosis = async () => {
    if (!anomaly) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anomalyData: anomaly,
          recentMetrics: {
            avgRms: recentAvgRms,
            peakToPeak: recentPeak,
          },
          equipmentContext,
        }),
      });

      const data = await res.json();
      if (data.diagnosis) {
        setDiagnosis(data.diagnosis);
      } else if (data.fallbackDiagnosis) {
        setDiagnosis(data.fallbackDiagnosis);
      } else {
        throw new Error(data.error || "진단 결과 생성 실패");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "AI 진단 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && anomaly) {
      fetchDiagnosis();
    } else {
      setDiagnosis(null);
      setError(null);
    }
  }, [isOpen, anomaly]);

  if (!isOpen || !anomaly) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-sm">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <span>Gemini AI 진동 이상 징후 정밀 진단</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-800 font-semibold">
                  Galaxy S24 Ultra IMU
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                이상 주파수 스펙트럼 및 가속도 파형을 공학적으로 심층 분석합니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Anomaly quick telemetry badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-3">
              <span className="text-slate-500">이벤트:</span>
              <span className="font-bold text-slate-900">{anomaly.description}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-700">
              <span>피크: <strong className="text-amber-700 font-bold">{anomaly.magnitude.toFixed(2)} m/s²</strong></span>
              <span>RMS: <strong className="text-cyan-700 font-bold">{anomaly.rms.toFixed(2)} m/s²</strong></span>
              <span>주파수: <strong className="text-blue-700 font-bold">{anomaly.dominantFreq.toFixed(1)} Hz</strong></span>
            </div>
          </div>

          {/* Equipment selector */}
          <div className="flex items-center space-x-2 text-xs">
            <label className="text-slate-600 font-mono whitespace-nowrap font-medium">측정 설비 맥락:</label>
            <select
              value={equipmentContext}
              onChange={(e) => setEquipmentContext(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-cyan-500 font-sans shadow-2xs"
            >
              <option value="산업용 회전 모터 및 펌프 설비">산업용 회전 모터 및 펌프 설비</option>
              <option value="공작기계 스핀들 및 감속기 기어박스">공작기계 스핀들 및 감속기 기어박스</option>
              <option value="HVAC 공조기 및 송풍 팬">HVAC 공조기 및 송풍 팬</option>
              <option value="건축물 바닥 및 교량 구조 진동">건축물 바닥 및 교량 구조 진동</option>
              <option value="스마트폰 휴대 및 거치대 이동 진동">스마트폰 휴대 및 거치대 이동 진동</option>
            </select>
            <button
              onClick={fetchDiagnosis}
              disabled={loading}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs flex items-center space-x-1 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-600" : ""}`} />
              <span>재분석</span>
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
              <p className="text-xs font-mono text-cyan-800 font-semibold animate-pulse">
                Gemini 2.5 Flash가 진동 스펙트럼과 ISO 규격을 해석하고 있습니다...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnosis Result */}
          {diagnosis && !loading && (
            <div className="space-y-4">
              {/* Primary Fault & Urgency */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-slate-500">추정 결함 원인 (Diagnosed Fault)</span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {diagnosis.faultType}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-cyan-50 text-cyan-800 border border-cyan-200">
                      신뢰도 {diagnosis.confidenceScore}%
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                        diagnosis.urgency === "CRITICAL"
                          ? "bg-rose-600 text-white"
                          : diagnosis.urgency === "HIGH"
                          ? "bg-amber-500 text-white font-bold"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      긴급도: {diagnosis.urgency}
                    </span>
                  </div>
                </div>

                {/* ISO Severity Class */}
                <div className="flex items-center space-x-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-500">ISO 10816 기준 분류:</span>
                  <span className="font-semibold text-slate-800">{diagnosis.isoSeverity}</span>
                </div>

                {/* Summary */}
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  "{diagnosis.summary}"
                </p>

                {/* Technical engineering explanation */}
                <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed shadow-2xs">
                  <div className="font-semibold text-slate-500 mb-1 font-mono text-[11px]">
                    [공학적 주파수/파형 분석]
                  </div>
                  {diagnosis.technicalDetails}
                </div>
              </div>

              {/* Actionable recommendations */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
                  <Wrench className="w-4 h-4 text-cyan-600" />
                  <span>현장 엔지니어 권장 대응 수칙</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {diagnosis.recommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>AI 진단은 설비 진동 신호 분석 가이드라인을 준수합니다.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium transition-colors shadow-2xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
