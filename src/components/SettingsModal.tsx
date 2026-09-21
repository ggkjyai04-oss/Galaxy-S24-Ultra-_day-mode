import React from "react";
import { SensorConfig } from "../types";
import { Settings, X, Sliders, Volume2, Bell, Smartphone, ShieldCheck } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: SensorConfig;
  onUpdateConfig: (newConfig: SensorConfig) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                이상 감지 임계치 및 센서 캘리브레이션
              </h3>
              <p className="text-[11px] text-slate-500">
                Galaxy S24 Ultra IMU 진동 경보 파라미터 설정
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

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">
          {/* Threshold Sliders */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 font-semibold text-slate-900">
              <Sliders className="w-4 h-4 text-cyan-600" />
              <span>진동 가속도 임계치 설정 (m/s²)</span>
            </div>

            {/* RMS Warning */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-amber-700 font-semibold">RMS 경고 임계치:</span>
                <span className="font-bold text-slate-900">
                  {config.rmsWarningThreshold.toFixed(1)} m/s²
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={config.rmsWarningThreshold}
                onChange={(e) =>
                  onUpdateConfig({ ...config, rmsWarningThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* RMS Critical */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-rose-700 font-semibold">RMS 위험 임계치:</span>
                <span className="font-bold text-slate-900">
                  {config.rmsCriticalThreshold.toFixed(1)} m/s²
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.2"
                value={config.rmsCriticalThreshold}
                onChange={(e) =>
                  onUpdateConfig({ ...config, rmsCriticalThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-rose-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Peak Critical */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-slate-700 font-medium">최대 충격 피크(Peak) 한계치:</span>
                <span className="font-bold text-cyan-700">
                  {config.peakCriticalThreshold.toFixed(1)} m/s²
                </span>
              </div>
              <input
                type="range"
                min="5.0"
                max="35.0"
                step="0.5"
                value={config.peakCriticalThreshold}
                onChange={(e) =>
                  onUpdateConfig({ ...config, peakCriticalThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Alert Toggles */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>실시간 알림 및 피드백 채널</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <span className="text-slate-800 font-medium">Web Audio 경보음 사이렌</span>
              </span>
              <input
                type="checkbox"
                checked={config.audioAlarmEnabled}
                onChange={(e) =>
                  onUpdateConfig({ ...config, audioAlarmEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-cyan-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-slate-500" />
                <span className="text-slate-800 font-medium">갤럭시 S24 울트라 햅틱 모터 진동</span>
              </span>
              <input
                type="checkbox"
                checked={config.hapticEnabled}
                onChange={(e) =>
                  onUpdateConfig({ ...config, hapticEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-cyan-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-slate-500" />
                <span className="text-slate-800 font-medium">브라우저 팝업 알림 (Web Notification)</span>
              </span>
              <input
                type="checkbox"
                checked={config.browserNotifyEnabled}
                onChange={(e) =>
                  onUpdateConfig({ ...config, browserNotifyEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-cyan-600 rounded"
              />
            </label>
          </div>

          {/* Galaxy Hardware Specs */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 space-y-1.5">
            <div className="text-slate-900 font-semibold font-sans">
              Samsung Galaxy S24 Ultra 센서 프로필
            </div>
            <div>• 센서 종류: 6축 초저잡음 MEMS IMU 가속도계</div>
            <div>• 샘플링 레이트: 최대 100Hz (브라우저 동기화: 60Hz)</div>
            <div>• 측정 범위: ±16g (최대 156.8 m/s²)</div>
            <div>• 신호 처리: 중력 가속도(9.8m/s²) 적응형 분리 IIR 필터</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg text-xs transition-colors shadow-2xs"
          >
            설정 완료
          </button>
        </div>
      </div>
    </div>
  );
};
