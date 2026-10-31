import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Download, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import { Batch, Candidate } from '../types';
import { api } from '../api/client';

interface PDFManagementProps {
  batch: Batch;
  onRefreshBatch: () => void;
}

export const PDFManagement: React.FC<PDFManagementProps> = ({ batch, onRefreshBatch }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isGeneratingPdfs, setIsGeneratingPdfs] = useState<boolean>(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zipData, setZipData] = useState<{ filename: string; size_mb: number; count: number } | null>(null);

  const loadData = async () => {
    try {
      const cands = await api.getCandidates(batch.id);
      setCandidates(cands);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [batch.id]);

  const handleGeneratePDFs = async () => {
    setIsGeneratingPdfs(true);
    setErrorMsg(null);
    try {
      await api.generatePDFs(batch.id);
      await loadData();
      onRefreshBatch();
    } catch (err: any) {
      setErrorMsg(err.message || 'PDF generation failed');
    } finally {
      setIsGeneratingPdfs(false);
    }
  };

  const handleGenerateZip = async () => {
    setIsGeneratingZip(true);
    setErrorMsg(null);
    try {
      const res = await api.generateZIP(batch.id);
      setZipData({
        filename: res.zip_filename,
        size_mb: res.size_mb,
        count: res.file_count
      });
      onRefreshBatch();
    } catch (err: any) {
      setErrorMsg(err.message || 'ZIP archive generation failed');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const conflictCount = candidates.filter(c => c.has_conflict || c.verification_status === 'conflict').length;
  const pdfGeneratedCount = candidates.filter(c => c.pdf_path).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Export Center
          </span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Individual PDF & ZIP Archive Generator
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          <b>1 Scanned Page = 1 Candidate = 1 QR Code = 1 PDF</b>. Named strictly as <code>&lt;register_number&gt;.pdf</code>.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Prominent ZIP Download Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
              <span>Lossless Single-Sheet Verification Guarantee</span>
            </div>
            <h2 className="text-2xl font-black">
              Batch Archive: HallTickets.zip
            </h2>
            <p className="text-sm text-emerald-100">
              Contains {candidates.length} candidate PDFs named strictly by decoded Register Number.
            </p>
          </div>

          {/* Prominent Single Click Download Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {batch.zip_ready || zipData ? (
              <a
                href={api.getZipDownloadUrl(batch.id)}
                download="HallTickets.zip"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5"
              >
                <Download className="h-5 w-5 text-emerald-700" />
                <span>DOWNLOAD COMPLETE ZIP ARCHIVE</span>
              </a>
            ) : (
              <button
                onClick={handleGenerateZip}
                disabled={isGeneratingZip || conflictCount > 0}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isGeneratingZip ? (
                  <>
                    <RotateCw className="h-5 w-5 animate-spin text-emerald-700" />
                    <span>Packaging HallTickets.zip...</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-5 w-5 text-emerald-700" />
                    <span>Generate & Package ZIP</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Quick Integrity Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/20 text-xs">
          <div>
            <span className="text-emerald-200 block font-semibold">Total Candidates</span>
            <span className="text-lg font-black text-white">{candidates.length}</span>
          </div>
          <div>
            <span className="text-emerald-200 block font-semibold">Total Pages Assembled</span>
            <span className="text-lg font-black text-white">{batch.total_pages} sheets</span>
          </div>
          <div>
            <span className="text-emerald-200 block font-semibold">Individual PDFs Ready</span>
            <span className="text-lg font-black text-white">{pdfGeneratedCount} / {candidates.length}</span>
          </div>
          <div>
            <span className="text-emerald-200 block font-semibold">Archive Size</span>
            <span className="text-lg font-black text-white">
              {batch.zip_size_mb ? `${batch.zip_size_mb} MB` : zipData ? `${zipData.size_mb} MB` : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm gap-3">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          Generated Candidate PDF Files ({candidates.length})
        </span>

        <div className="flex items-center gap-3">
          {/* CSV Export Button */}
          <a
            href={api.getCsvExportUrl(batch.id)}
            download
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Register Numbers (CSV)</span>
          </a>

          <button
            onClick={handleGeneratePDFs}
            disabled={isGeneratingPdfs || conflictCount > 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isGeneratingPdfs ? 'animate-spin' : ''}`} />
            <span>{isGeneratingPdfs ? 'Generating PDFs...' : 'Regenerate All PDFs'}</span>
          </button>
        </div>
      </div>

      {/* Individual Candidate PDFs Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Filename</th>
              <th className="py-3 px-4">Register Number</th>
              <th className="py-3 px-4">Candidate Name</th>
              <th className="py-3 px-4">Sheet Count</th>
              <th className="py-3 px-4">Verification</th>
              <th className="py-3 px-4 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {candidates.map((cand) => (
              <tr key={cand.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {cand.roll_number}.pdf
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {cand.roll_number}
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                  {cand.candidate_name}
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                  1 sheet
                </td>
                <td className="py-3.5 px-4">
                  {cand.verification_status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      {cand.verification_status}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <a
                    href={api.getCandidatePdfDownloadUrl(cand.id)}
                    download={`${cand.roll_number}.pdf`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
