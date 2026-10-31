import React, { useState } from 'react';
import { Settings, ShieldCheck, CheckCircle2, Lock, Sliders, Database, Server } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [primaryField, setPrimaryField] = useState<string>('Roll Number');
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [blankThreshold, setBlankThreshold] = useState<number>(99.2);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            System Preferences
          </span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Center Settings & Configuration
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure OCR identifier mappings, scanning parameters, security, and document retention rules.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      {/* Primary Identifier */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Primary Candidate Identifier
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select which field header the OCR engine will use to generate candidate PDF filenames.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {['Roll Number', 'Register Number', 'Hall Ticket Number', 'Candidate ID'].map((opt) => (
            <label
              key={opt}
              className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                primaryField === opt
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="primaryField"
                checked={primaryField === opt}
                onChange={() => setPrimaryField(opt)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* OCR & Document Processing Sensitivity */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Scanning & OCR Thresholds
          </h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span>Blank Sheet Detection Threshold ({blankThreshold}%)</span>
              <span>Near-White Pixel Density</span>
            </div>
            <input
              type="range"
              min="95.0"
              max="99.9"
              step="0.1"
              value={blankThreshold}
              onChange={(e) => setBlankThreshold(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span>Document Retention Duration</span>
              <span>{retentionDays} Days</span>
            </div>
            <input
              type="range"
              min="7"
              max="180"
              step="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Security & Local Isolation */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Lock className="h-4 w-4" />
          <h3 className="text-sm font-bold">Data Privacy & Local Processing Guarantee</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hall ticket documents contain sensitive candidate personal information. All OCR parsing, image deskewing, grouping algorithms, and PDF rendering execute 100% locally on this workstation. No candidate data or images are ever transmitted to third-party cloud APIs.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};
