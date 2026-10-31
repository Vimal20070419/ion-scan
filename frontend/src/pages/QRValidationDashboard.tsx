import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Edit3, 
  RotateCw, 
  Trash2, 
  Download, 
  ArrowRight, 
  Eye, 
  FileText,
  AlertCircle,
  FileCheck2,
  Filter
} from 'lucide-react';
import { Batch, Candidate, ScannedPage } from '../types';
import { api } from '../api/client';
import { PDFViewerModal } from '../components/PDFViewerModal';

interface QRValidationDashboardProps {
  batch: Batch;
  onNavigateExport: () => void;
}

export const QRValidationDashboard: React.FC<QRValidationDashboardProps> = ({ batch, onNavigateExport }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'review' | 'conflict'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewPage, setPreviewPage] = useState<ScannedPage | null>(null);

  // Edit State
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [editRegisterNumber, setEditRegisterNumber] = useState<string>('');
  const [editName, setEditName] = useState<string>('');

  // Retrying State
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.getCandidates(batch.id);
      setCandidates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [batch.id]);

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return;
    try {
      await api.updateCandidate(editingCandidate.id, {
        roll_number: editRegisterNumber.trim(),
        candidate_name: editName.trim(),
      });
      setEditingCandidate(null);
      await loadCandidates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetryQR = async (cand: Candidate) => {
    if (!cand.pages || cand.pages.length === 0) return;
    const pageId = cand.pages[0].scanned_page.id;
    setRetryingId(cand.id);
    try {
      await api.retryPageQR(pageId);
      await loadCandidates();
    } catch (err) {
      console.error(err);
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteCandidate = async (candidateId: number) => {
    if (!window.confirm('Are you sure you want to remove this record?')) return;
    try {
      await api.deleteCandidate(candidateId);
      await loadCandidates();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const isConflict = c.has_conflict || c.verification_status === 'conflict';
    const isSuccess = c.qr_status === 'success' && !isConflict;
    const isReview = c.verification_status === 'review_required' || c.qr_status !== 'success';

    if (filter === 'success' && !isSuccess) return false;
    if (filter === 'review' && !isReview) return false;
    if (filter === 'conflict' && !isConflict) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchReg = c.roll_number.toLowerCase().includes(term);
      const matchName = c.candidate_name.toLowerCase().includes(term);
      const matchPage = c.pages.some(cp => `page ${cp.scanned_page.original_page_number}`.includes(term));
      if (!matchReg && !matchName && !matchPage) return false;
    }
    return true;
  });

  const conflictCount = candidates.filter(c => c.has_conflict || c.verification_status === 'conflict').length;
  const failedCount = candidates.filter(c => c.qr_status !== 'success').length;
  const decodedCount = candidates.filter(c => c.qr_status === 'success').length;
  const pdfsReadyCount = candidates.filter(c => c.pdf_path).length;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              QR Recognition Engine
            </span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              QR Scanning Results & Validation Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            <b>1 Page = 1 Candidate = 1 QR Code = 1 PDF</b>. Each candidate's Register Number is automatically decoded from their hall ticket QR code.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateExport}
            disabled={conflictCount > 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <span>Proceed to PDF & ZIP Export</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Duplicate Register Number Warning Banner */}
      {conflictCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-extrabold">
                Duplicate Register Number Conflict Detected ({conflictCount} pages affected)
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-300">
                Multiple hall ticket pages have decoded to identical register numbers. Inspect both pages below and edit the Register Number to resolve the conflict before exporting.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('conflict')}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm shrink-0"
          >
            Filter Duplicate Conflicts
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block">Total Pages</span>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100">{candidates.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block">Decoded QR Codes</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{decodedCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold block">Failed / Review</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{failedCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold block">Duplicate Numbers</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400">{conflictCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold block">PDFs Ready</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400">{pdfsReadyCount} / {candidates.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search register number, candidate name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Pages ({candidates.length})
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            QR Success ({decodedCount})
          </button>
          <button
            onClick={() => setFilter('review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'review'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Review ({failedCount})
          </button>
          {conflictCount > 0 && (
            <button
              onClick={() => setFilter('conflict')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === 'conflict'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
              }`}
            >
              Conflicts ({conflictCount})
            </button>
          )}
        </div>
      </div>

      {/* Results Table (Section 6 Requirements) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Page #</th>
              <th className="py-3.5 px-4">Scanned Sheet</th>
              <th className="py-3.5 px-4">Decoded Register Number</th>
              <th className="py-3.5 px-4">Candidate Name</th>
              <th className="py-3.5 px-4">QR Status</th>
              <th className="py-3.5 px-4">PDF Output Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <RotateCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                  <span className="block mt-2 font-bold">Scanning QR codes...</span>
                </td>
              </tr>
            ) : filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No records matched the filter criteria.
                </td>
              </tr>
            ) : (
              filteredCandidates.map((cand) => {
                const sp = cand.pages[0]?.scanned_page;
                const isConflict = cand.has_conflict || cand.verification_status === 'conflict';
                const isSuccess = cand.qr_status === 'success' && !isConflict;
                const pageNum = sp ? sp.original_page_number : 1;

                return (
                  <tr 
                    key={cand.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isConflict ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    {/* Page Number */}
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      Page #{pageNum}
                    </td>

                    {/* Scanned Sheet Thumbnail */}
                    <td className="py-3.5 px-4">
                      {sp?.page_image_path ? (
                        <div 
                          onClick={() => setPreviewPage(sp)}
                          className="h-12 w-10 rounded border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer bg-slate-100 hover:ring-2 hover:ring-emerald-500 transition-all"
                        >
                          <img
                            src={sp.page_image_path}
                            alt={`Page ${pageNum}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-10 rounded border bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <FileText className="h-4 w-4" />
                        </div>
                      )}
                    </td>

                    {/* Register Number */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold text-sm ${
                          isConflict 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : isSuccess 
                              ? 'text-emerald-700 dark:text-emerald-300' 
                              : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {cand.roll_number}
                        </span>
                        <button
                          onClick={() => {
                            setEditingCandidate(cand);
                            setEditRegisterNumber(cand.roll_number);
                            setEditName(cand.candidate_name);
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                          title="Manually edit Register Number"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                      {cand.notes && (
                        <span className="text-[10px] text-rose-500 font-semibold block mt-0.5">
                          {cand.notes}
                        </span>
                      )}
                    </td>

                    {/* Candidate Name */}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {cand.candidate_name}
                    </td>

                    {/* QR Status */}
                    <td className="py-3.5 px-4">
                      {isConflict ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" />
                          Duplicate Conflict
                        </span>
                      ) : isSuccess ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Success ({sp?.decoder_info || 'QR'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          QR Not Detected
                        </span>
                      )}
                    </td>

                    {/* PDF Output Status */}
                    <td className="py-3.5 px-4">
                      {cand.pdf_path ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Generated ({cand.roll_number}.pdf)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Pending export
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {sp && (
                        <button
                          onClick={() => setPreviewPage(sp)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                          title="Inspect page image and QR payload"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}

                      {!isSuccess && (
                        <button
                          onClick={() => handleRetryQR(cand)}
                          disabled={retryingId === cand.id}
                          className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400"
                          title="Retry QR detection at 300 DPI"
                        >
                          <RotateCw className={`h-4 w-4 ${retryingId === cand.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteCandidate(cand.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Delete candidate record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Register Number Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              Manual Register Number Input
            </h3>
            <p className="text-xs text-slate-500">
              Enter the correct candidate Register Number for this hall ticket. This will be used as the filename (e.g. <code>123456001.pdf</code>).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Candidate Register Number
                </label>
                <input
                  type="text"
                  value={editRegisterNumber}
                  onChange={(e) => setEditRegisterNumber(e.target.value)}
                  placeholder="e.g. 123456001"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Candidate name..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCandidate(null)}
                className="px-4 py-2 rounded-lg text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCandidate}
                disabled={!editRegisterNumber.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                Save & Validate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Inspection Modal */}
      <PDFViewerModal
        page={previewPage}
        onClose={() => setPreviewPage(null)}
      />
    </div>
  );
};
