import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
}

export default function BarcodeScanner({ onScan, onClose, title = 'Scan Code' }: Props) {
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        const scanner = new Html5Qrcode('barcode-scanner-reader');
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!mountedRef.current) return;

        if (cameras.length === 0) {
          setError('No camera found on this device');
          return;
        }

        // Prefer back-facing camera
        const backCam = cameras.find((c: any) =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('environment')
        ) || cameras[0];

        await scanner.start(
          { deviceId: backCam.id },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            onScan(decodedText);
            setTimeout(() => {
              if (mountedRef.current) onClose();
            }, 300);
          },
          () => { /* ignore scan errors */ }
        );

        if (mountedRef.current) setInitialized(true);
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err?.message || 'Failed to initialize camera');
        }
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--bg-surface)] rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-4 border border-[var(--border-color)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="btn-icon text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close scanner">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner area */}
        <div className="relative">
          <div id="barcode-scanner-reader" className="w-full min-h-[280px] bg-black flex items-center justify-center" />

          {/* Scanning overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/40 rounded-xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-lg shadow-cyan-400/50"
                style={{ animation: 'scanLine 1.5s ease-in-out infinite' }} />
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br" />
            </div>
          </div>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center p-6">
                <svg className="w-10 h-10 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-400 mb-3">{error}</p>
                <button onClick={onClose} className="btn-secondary text-sm">Close</button>
              </div>
            </div>
          )}

          {!initialized && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[var(--text-muted)]">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-color)]">
          <p className="text-xs text-center text-[var(--text-muted)]">
            Point your camera at a barcode or QR code
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 75%; }
        }
      `}</style>
    </div>
  );
}
