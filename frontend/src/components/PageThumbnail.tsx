import React from 'react';
import { ZoomIn, CheckCircle2, AlertTriangle, FileText, QrCode, RotateCw } from 'lucide-react';
import { ScannedPage } from '../types';

interface PageThumbnailProps {
  page: ScannedPage;
  onPreview: (page: ScannedPage) => void;
  onRetryQR?: (page: ScannedPage) => void;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  page,
  onPreview,
  onRetryQR,
}) => {
  const isSuccess = page.qr_status === 'success';
  const isConflict = page.verification_status === 'conflict';

  return (
    <div className={`group relative flex flex-col rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all ${
      isConflict 
        ? 'border-rose-400 ring-1 ring-rose-400' 
        : isSuccess 
          ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700' 
          : 'border-amber-300 ring-1 ring-amber-300'
    }`}>
      {/* Top Banner Badges */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-[11px]">
        <span className="font-bold text-slate-700 dark:text-slate-300">
          Page #{page.original_page_number}
        </span>
        
        {/* QR Status Badge */}
        {isConflict ? (
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3 w-3" />
            Duplicate
          </span>
        ) : isSuccess ? (
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            QR Decoded
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            QR Missing
          </span>
        )}
      </div>

      {/* Image Preview Area */}
      <div 
        onClick={() => onPreview(page)}
        className="relative h-44 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer group-hover:opacity-95"
      >
        {page.page_image_path ? (
          <img
            src={page.page_image_path}
            alt={`Page ${page.original_page_number}`}
            className="w-full h-full object-contain p-1.5"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <FileText className="h-8 w-8" />
            <span className="text-xs">Preview unavailable</span>
          </div>
        )}

        {/* Hover zoom overlay */}
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-1.5">
            <ZoomIn className="h-3.5 w-3.5" />
            <span>Click to Inspect</span>
          </div>
        </div>

        {/* Decoder Tag */}
        {page.decoder_info && (
          <div className="absolute bottom-2 left-2">
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-800/80 text-slate-200 backdrop-blur-sm">
              {page.decoder_info}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Info & Register Number */}
      <div className="p-2 bg-white dark:bg-slate-900 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800">
        <div className="truncate pr-1">
          {page.recognized_roll_number ? (
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
              {page.recognized_roll_number}
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 italic text-[11px]">
              No register #
            </span>
          )}
        </div>

        {/* Retry Button if QR failed */}
        {!isSuccess && onRetryQR && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetryQR(page); }}
            className="p-1 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded text-amber-600 dark:text-amber-400"
            title="Retry QR detection at 300 DPI"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
