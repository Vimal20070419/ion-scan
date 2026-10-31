import React from 'react';
import { 
  FileStack, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Printer, 
  Archive, 
  ArrowRight, 
  QrCode,
  Sparkles
} from 'lucide-react';
import { Batch, DashboardStats } from '../types';
import { NavTab } from '../components/Sidebar';

interface DashboardProps {
  stats: DashboardStats | null;
  batches: Batch[];
  selectedBatch: Batch | null;
  onSelectBatch: (b: Batch) => void;
  onNavigate: (tab: NavTab) => void;
  onTriggerQRScan: (batchId: number) => void;
  isProcessing: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  batches,
  selectedBatch,
  onSelectBatch,
  onNavigate,
  onTriggerQRScan,
  isProcessing
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-200 border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            <span>ADF QR Code Recognition Architecture</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            HallTicket Pro Processing Center
          </h1>
          <p className="text-sm text-emerald-100 leading-relaxed font-normal">
            Every candidate has exactly <b>ONE hall ticket page</b> containing a QR code. HallTicket Pro scans each page, decodes the Register Number from the QR payload, validates against duplicate conflicts, and losslessly generates individual PDFs into a unified ZIP archive.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('scanner')}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              <span>Launch ADF Scanner Feed</span>
            </button>
            <button
              onClick={() => onNavigate('upload')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600/60 hover:bg-emerald-600 border border-white/20 text-white font-bold text-sm transition-all flex items-center gap-2"
            >
              <span>Upload Scanned PDF</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Pages */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <FileStack className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Scanned Sheets</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {stats?.total_pages.toLocaleString() ?? 0}
            </h3>
            <span className="text-[11px] font-medium text-slate-400">1 sheet = 1 candidate</span>
          </div>
        </div>

        {/* Card 2: Decoded QR Codes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Decoded QR Codes</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats?.decoded_qr_codes ?? 0}
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Register numbers verified</span>
          </div>
        </div>

        {/* Card 3: Review / Conflicts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
            (stats?.conflict_candidates ?? 0) > 0 
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Review & Conflicts</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {(stats?.failed_qr_detections ?? 0) + (stats?.conflict_candidates ?? 0)}
            </h3>
            <span className="text-[11px] font-medium text-slate-400">
              {stats?.conflict_candidates ?? 0} duplicate numbers
            </span>
          </div>
        </div>

        {/* Card 4: Generated PDFs */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">PDFs Generated</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {stats?.pdfs_generated.toLocaleString() ?? 0}
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Lossless & Reg-named</span>
          </div>
        </div>
      </div>

      {/* Active Batch Step-by-Step Flow Bar */}
      {selectedBatch && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Active Batch Pipeline
              </span>
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                {selectedBatch.batch_name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Status: {selectedBatch.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Step 1</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">ADF Ingestion</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedBatch.total_pages} sheets ingested
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              selectedBatch.status === 'uploaded' 
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Step 2</span>
                {selectedBatch.status !== 'uploaded' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <button
                    onClick={() => onTriggerQRScan(selectedBatch.id)}
                    disabled={isProcessing}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    Scan QR
                  </button>
                )}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">QR Code Decoding</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extract Register Numbers
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              selectedBatch.status === 'qr_scanned' || selectedBatch.status === 'ready_for_review' || selectedBatch.status === 'ready_for_export'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Step 3</span>
                <button
                  onClick={() => onNavigate('qr_results')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  Validate ({selectedBatch.total_candidates})
                </button>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Candidate Validation</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedBatch.conflict_candidates > 0 ? `${selectedBatch.conflict_candidates} conflicts` : 'All records validated'}
              </p>
            </div>

            {/* Step 4 */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              selectedBatch.zip_ready 
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Step 4</span>
                {selectedBatch.zip_ready ? (
                  <a
                    href={`/api/export/batch/${selectedBatch.id}/download-zip`}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    ZIP
                  </a>
                ) : (
                  <button
                    onClick={() => onNavigate('export')}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                  >
                    Export
                  </button>
                )}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">1 Page = 1 PDF in ZIP</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download HallTickets.zip
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Batches Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              Scanned ADF Batches
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage all examination ADF feed batches and their processing state.
            </p>
          </div>
          <button
            onClick={() => onNavigate('upload')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <span>+ New ADF Batch</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Batch Name</th>
                <th className="py-3 px-4">Examination</th>
                <th className="py-3 px-4">Sheets</th>
                <th className="py-3 px-4">Candidates</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">ZIP Archive</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {batches.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No scanned batches found. Click "Launch ADF Scanner Feed" or "Upload Scanned PDF" to begin.
                  </td>
                </tr>
              )}
              {batches.map((b) => (
                <tr 
                  key={b.id} 
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    selectedBatch?.id === b.id ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                    <button
                      onClick={() => onSelectBatch(b)}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 text-left font-bold"
                    >
                      {b.batch_name}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {b.examination_name}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    {b.total_pages} sheets
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{b.total_candidates}</span>
                    {b.conflict_candidates > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        {b.conflict_candidates} conflicts
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {b.zip_ready ? (
                      <a
                        href={`/api/export/batch/${b.id}/download-zip`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download ZIP ({b.zip_size_mb ?? 0} MB)
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Not ready</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => { onSelectBatch(b); onNavigate('qr_results'); }}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold"
                    >
                      Validate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
