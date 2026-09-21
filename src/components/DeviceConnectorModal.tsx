import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone, X, Copy, Check, ExternalLink, QrCode, Wifi } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSensorMode: () => void;
}

export const DeviceConnectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSwitchToSensorMode,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
  const sensorUrl = `${currentUrl}?mode=sensor`;

  useEffect(() => {
    if (isOpen && sensorUrl) {
      QRCode.toDataURL(sensorUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#f8fafc",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, sensorUrl]);

  const handleCopy = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(sensorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                갤럭시 S24 울트라 무선 센서 연동
              </h3>
              <p className="text-xs text-slate-500">
                실물 기기의 가속도 센서를 IoT 진동 프로브로 연결합니다
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
        <div className="p-6 space-y-5">
          {/* QR Code section */}
          <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                <img src={qrDataUrl} alt="Galaxy S24 Ultra Sensor QR Code" className="w-44 h-44" />
              </div>
            ) : (
              <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-xl" />
            )}
            <div className="mt-3 flex items-center space-x-2 text-xs font-mono text-cyan-700 font-semibold">
              <QrCode className="w-3.5 h-3.5" />
              <span>갤럭시 카메라로 QR 코드를 스캔하세요</span>
            </div>
          </div>

          {/* Direct URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-600 font-medium">모바일 센서 송신 주소</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={sensorUrl}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Steps */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2 text-slate-600">
            <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
              <Wifi className="w-4 h-4 text-cyan-600" />
              <span>연결 안내 가이드</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed font-sans">
              <li>갤럭시 S24 울트라 카메라로 QR을 스캔하거나 주소를 브라우저로 엽니다.</li>
              <li>화면의 <span className="text-cyan-700 font-semibold">'센서 스트리밍 시작'</span>을 누릅니다.</li>
              <li>갤럭시 폰을 측정 대상(설비, 모터, 책상 등)에 부착/거치합니다.</li>
              <li>이상 진동 발생 시 폰에서 진동 햅틱 경보가 울리고 본 대시보드로 즉시 전송됩니다.</li>
            </ol>
          </div>

          {/* Mode switch option for this device */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
            <span className="text-slate-500">현재 브라우저에서 바로 센서 모드로 전환하시겠습니까?</span>
            <button
              onClick={() => {
                onSwitchToSensorMode();
                onClose();
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg flex items-center space-x-1 transition-colors shadow-2xs"
            >
              <span>이 기기를 센서 노드로 사용</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
