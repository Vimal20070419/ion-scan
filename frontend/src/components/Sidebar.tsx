import React from 'react';
import { 
  LayoutDashboard, 
  Printer, 
  UploadCloud, 
  QrCode, 
  Archive, 
  History, 
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';

export type NavTab = 
  | 'dashboard' 
  | 'scanner' 
  | 'upload' 
  | 'qr_results' 
  | 'export' 
  | 'history' 
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  candidateReviewCount: number;
  conflictCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  candidateReviewCount,
  conflictCount
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'scanner' as NavTab, label: 'ADF Scanner Feed', icon: Printer, badge: 'Direct' },
    { id: 'upload' as NavTab, label: 'Bulk Document Upload', icon: UploadCloud },
    { 
      id: 'qr_results' as NavTab, 
      label: 'QR Scanner & Results', 
      icon: QrCode,
      badge: conflictCount > 0 ? `${conflictCount} Conflicts` : candidateReviewCount > 0 ? `${candidateReviewCount} Review` : undefined,
      badgeColor: conflictCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
    },
    { id: 'export' as NavTab, label: 'PDFs & ZIP Download', icon: Archive },
    { id: 'history' as NavTab, label: 'Processing Audit Logs', icon: History },
    { id: 'settings' as NavTab, label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          Examination Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 dark:bg-emerald-600 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.badgeColor || 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* QR Processing Rule Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/60 dark:to-slate-900/60 border border-emerald-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>QR Code Rule</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          <b>1 Page = 1 Candidate = 1 QR Code</b>. The Register Number is extracted from the QR code and used as the PDF filename.
        </p>
      </div>
    </aside>
  );
};
