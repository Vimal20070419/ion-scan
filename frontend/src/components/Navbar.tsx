import React from 'react';
import { 
  FileStack, 
  QrCode, 
  Sun, 
  Moon, 
  RefreshCw,
  Cpu
} from 'lucide-react';
import { Batch } from '../types';

interface NavbarProps {
  batches: Batch[];
  selectedBatch: Batch | null;
  onSelectBatch: (b: Batch) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  batches,
  selectedBatch,
  onSelectBatch,
  darkMode,
  onToggleDarkMode,
  onRefresh,
  isRefreshing
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3 transition-colors">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <QrCode className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                HallTicket Pro
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                QR ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              1 Page = 1 Candidate = 1 QR Code = 1 PDF
            </p>
          </div>
        </div>

        {/* Batch Selector & Actions */}
        <div className="flex items-center gap-4">
          {/* Active Batch Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <FileStack className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Batch:</span>
            <select
              value={selectedBatch?.id || ''}
              onChange={(e) => {
                const found = batches.find(b => b.id === Number(e.target.value));
                if (found) onSelectBatch(found);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {batches.length === 0 && <option value="">No batches uploaded</option>}
              {batches.map(b => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {b.batch_name} ({b.total_pages} sheets)
                </option>
              ))}
            </select>
          </div>

          {/* Scanner Bridge Status Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <Cpu className="h-3.5 w-3.5" />
            <span>ADF Scanner Ready</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh active batch data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {/* Operator Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
              EC
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <p className="font-bold text-slate-800 dark:text-slate-200">Exam Center 104</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Chief Superintendent</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
