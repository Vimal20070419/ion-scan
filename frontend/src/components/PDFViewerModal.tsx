import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, QrCode, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { ScannedPage } from '../types';

interface PDFViewerModalProps {
  page: ScannedPage | null;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ page, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState<'image' | 'qr'>('image');

  if (!page) return null;

  const isSuccess = page.qr_status === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-lg text-slate-800 dark:text-slate-100">
              Page Inspection — #{page.original_page_number}
            </span>
            {isSuccess ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                QR Decoded: {page.recognized_roll_number}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                QR Not Detected (Manual Input Required)
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setActiveTab('image')}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'image'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Scanned Sheet
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'qr'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                QR Payload Data
              </button>
            </div>

            {activeTab === 'image' && (
              <>
                <button
                  onClick={() => setZoom(prev => Math.min(prev + 0.25, 2.5))}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                  title="Rotate 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-600 rounded-lg text-slate-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-100/70 dark:bg-slate-950 min-h-[500px]">
          {activeTab === 'image' ? (
            <div className="transition-transform duration-200" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}>
              {page.page_image_path ? (
                <img
                  src={page.page_image_path}
                  alt={`Page ${page.original_page_number}`}
                  className="max-h-[70vh] rounded-lg shadow-xl border border-slate-300 dark:border-slate-800 object-contain"
                />
              ) : (
                <p className="text-slate-400">Image not generated</p>
              )}
            </div>
          ) : (
            <div className="w-full h-full max-h-[70vh] overflow-auto bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Extracted Register Number</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {page.recognized_roll_number || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Candidate Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {page.recognized_name || 'Candidate'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">QR Decoder Method</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {page.decoder_info || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Detection Status</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase">
                    {page.qr_status}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Raw Decoded QR Code Payload
                </h4>
                <pre className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-auto">
                  {page.raw_qr_payload || 'No QR code payload detected on this page.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
