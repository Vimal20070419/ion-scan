import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Settings2, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Sliders, 
  Layers, 
  FileCheck,
  Sparkles
} from 'lucide-react';
import { ScannerDevice, ScannerConfigState } from '../types';
import { api } from '../api/client';

interface ScannerConfigProps {
  onScanSuccess: (batchId: number) => void;
}

export const ScannerConfig: React.FC<ScannerConfigProps> = ({ onScanSuccess }) => {
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [selectedScanner, setSelectedScanner] = useState<string>('Virtual ADF Sheet-Fed Scanner (20-Page QR Hall Ticket Stack)');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [pagesFed, setPagesFed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [config, setConfig] = useState<ScannerConfigState>({
    scanner_name: 'Virtual ADF Sheet-Fed Scanner (20-Page QR Hall Ticket Stack)',
    paper_size: 'A4',
    resolution_dpi: 300,
    color_mode: 'color',
    duplex: false,
    auto_rotate: true,
    blank_detection: true,
    deskew: true
  });

  useEffect(() => {
    api.getScannerDevices().then(devs => {
      setDevices(devs);
      if (devs.length > 0) {
        // Default to Virtual ADF simulator for instant testing
        const virt = devs.find(d => d.id.includes('virtual'));
        if (virt) {
          setSelectedScanner(virt.name);
          setConfig(prev => ({ ...prev, scanner_name: virt.name }));
        }
      }
    }).catch(console.error);
  }, []);

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanProgress(5);
    setPagesFed(0);
    setErrorMsg(null);

    // Visual ADF feed counter
    const interval = setInterval(() => {
      setPagesFed(prev => {
        if (prev < 20) return prev + 1;
        return prev;
      });
      setScanProgress(prev => Math.min(prev + 10, 95));
    }, 150);

    try {
      const res = await api.triggerScan(config, "ADF_QR_Scan_Stack");
      clearInterval(interval);
      setPagesFed(res.pages_scanned || 20);
      setScanProgress(100);

      setTimeout(() => {
        setIsScanning(false);
        onScanSuccess(res.batch_id);
      }, 700);
    } catch (err: any) {
      clearInterval(interval);
      setIsScanning(false);
      setErrorMsg(err.message || 'Scanning acquisition failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Hardware Bridge
          </span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            ADF Scanner Integration & Control
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Direct sheet-feeder control for high-speed document scanners (Fujitsu, Epson, Canon, Windows TWAIN/WIA & Virtual ADF).
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Scanner Config Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Hardware Selection & Status */}
        <div className="md:col-span-2 space-y-6">
          {/* Scanner Device Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    Connected Scanner Device
                  </h3>
                  <p className="text-xs text-slate-400">Select physical ADF or simulated testing scanner</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Active Document Scanner</label>
              <select
                value={config.scanner_name}
                onChange={(e) => setConfig({ ...config, scanner_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.type}) — {d.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick feature checklist */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>ADF Continuous Feed Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Variable Page Ingestion</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Lossless Vector Reproduction</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Automatic Deskew & Blank Check</span>
              </div>
            </div>
          </div>

          {/* Scanner Parameters Configuration */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                Scanning Parameters
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Paper Size */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Paper Size</label>
                <select
                  value={config.paper_size}
                  onChange={(e) => setConfig({ ...config, paper_size: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="A4">A4 (210 x 297 mm)</option>
                  <option value="Legal">Legal (8.5 x 14 in)</option>
                  <option value="Letter">Letter (8.5 x 11 in)</option>
                </select>
              </div>

              {/* Resolution DPI */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Resolution (DPI)</label>
                <select
                  value={config.resolution_dpi}
                  onChange={(e) => setConfig({ ...config, resolution_dpi: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value={200}>200 DPI (Fast / Bulk)</option>
                  <option value={300}>300 DPI (Recommended for QR Code Scanning)</option>
                  <option value={600}>600 DPI (Ultra Fine Detail)</option>
                </select>
              </div>

              {/* Color Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Color Mode</label>
                <select
                  value={config.color_mode}
                  onChange={(e) => setConfig({ ...config, color_mode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="color">Full 24-bit Color</option>
                  <option value="grayscale">8-bit Grayscale</option>
                  <option value="bw">Black & White (Bitonal)</option>
                </select>
              </div>

              {/* Duplex / Simplex */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Feeder Mode</label>
                <select
                  value={config.duplex ? 'duplex' : 'simplex'}
                  onChange={(e) => setConfig({ ...config, duplex: e.target.value === 'duplex' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="duplex">Duplex (Both sides of sheet)</option>
                  <option value="simplex">Simplex (Front side only)</option>
                </select>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={config.auto_rotate}
                  onChange={(e) => setConfig({ ...config, auto_rotate: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Automatic Orientation & Page Rotation Correction</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={config.deskew}
                  onChange={(e) => setConfig({ ...config, deskew: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Automatic Deskewing (OpenCV MinAreaRect angle correction)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={config.blank_detection}
                  onChange={(e) => setConfig({ ...config, blank_detection: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Blank Page Detection (Automatically ignore empty back-pages)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Feeder Action Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl border border-slate-800 space-y-6 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Printer className={`h-8 w-8 ${isScanning ? 'animate-bounce text-blue-300' : ''}`} />
            </div>

            <div>
              <h3 className="text-lg font-black tracking-tight">ADF Sheet Feeder</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isScanning 
                  ? `Feeding sheets: ${pagesFed} pages scanned...` 
                  : 'Place stack in scanner input tray and start continuous feed'}
              </p>
            </div>

            {/* Animation when scanning */}
            {isScanning && (
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                  <span>Feeding page {pagesFed}...</span>
                  <span>{scanProgress}%</span>
                </div>
              </div>
            )}

            <button
              onClick={handleStartScan}
              disabled={isScanning}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>Scanning Stack...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Start ADF Feed Scan</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400">
              *The Virtual ADF option feeds our 20-sheet multipage QR test stack. Each page contains a single candidate's hall ticket with their embedded QR code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
