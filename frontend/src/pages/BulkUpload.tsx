import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  Layers,
  FileStack
} from 'lucide-react';
import { api } from '../api/client';

interface BulkUploadProps {
  onUploadSuccess: (batchId: number) => void;
}

export const BulkUpload: React.FC<BulkUploadProps> = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState<string>('');
  const [examName, setExamName] = useState<string>('National Entrance Examination 2026');
  const [examDate, setExamDate] = useState<string>('15-Nov-2026');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select at least one scanned PDF or image file');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (batchName.trim()) formData.append('batch_name', batchName.trim());
    formData.append('examination_name', examName);
    formData.append('examination_date', examDate);

    try {
      const res = await api.uploadFiles(formData);
      setIsUploading(false);
      onUploadSuccess(res.batch_id);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || 'Upload failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Batch Ingestion
          </span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Bulk Document Upload
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload scanner software-generated multipage PDFs, TIFF stacks, or image sequences. Original files are preserved immutably.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="p-10 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-center space-y-4 cursor-pointer"
      >
        <div className="h-16 w-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
          <UploadCloud className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Drag & drop multipage scanner PDFs or images here
          </h3>
          <p className="text-xs text-slate-400">
            Supports PDF (large multipage ADF scans), TIFF, JPG, JPEG, PNG
          </p>
        </div>

        <label className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer">
          <span>Browse Document Files</span>
          <input
            type="file"
            multiple
            accept=".pdf,.tiff,.tif,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Batch Metadata Fields */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <span>Examination Batch Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Batch Identifier Name</label>
            <input
              type="text"
              placeholder="e.g. NET2026_ADF_Session1"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Examination Title</label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exam Date</label>
            <input
              type="text"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Staged File List */}
      {files.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileStack className="h-4 w-4 text-blue-600" />
              <span>Staged Files for Ingestion ({files.length})</span>
            </h4>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
            >
              Clear All
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-auto">
            {files.map((file, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-sm">
                    {file.name}
                  </span>
                  <span className="text-slate-400">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isUploading ? 'Uploading & Extracting Pages...' : 'Start Ingestion Pipeline'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
