import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ScannerConfig } from './pages/ScannerConfig';
import { BulkUpload } from './pages/BulkUpload';
import { QRValidationDashboard } from './pages/QRValidationDashboard';
import { PDFManagement } from './pages/PDFManagement';
import { HistoryView } from './pages/HistoryView';
import { SettingsView } from './pages/SettingsView';
import { Batch, DashboardStats } from './types';
import { api } from './api/client';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Sync dark class on root html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [bList, st] = await Promise.all([
        api.getBatches(),
        api.getDashboardStats()
      ]);
      setBatches(bList);
      setStats(st);

      // Default to first batch if none selected
      if (bList.length > 0) {
        setSelectedBatch(prev => {
          if (!prev) return bList[0];
          const found = bList.find(b => b.id === prev.id);
          return found || bList[0];
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerQRScan = async (batchId: number) => {
    setIsProcessing(true);
    try {
      await api.triggerQRScan(batchId);
      await loadData();
      const updated = await api.getBatch(batchId);
      setSelectedBatch(updated);
      setCurrentTab('qr_results');
    } catch (err) {
      console.error('QR Scanning error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanSuccess = async (batchId: number) => {
    await loadData();
    // Automatically trigger QR detection & Register Number extraction
    try {
      await api.triggerQRScan(batchId);
      await loadData();
      const updated = await api.getBatch(batchId);
      setSelectedBatch(updated);
      setCurrentTab('qr_results');
    } catch (err) {
      console.error('Auto QR processing failed:', err);
      setCurrentTab('qr_results');
    }
  };

  const handleUploadSuccess = async (batchId: number) => {
    await loadData();
    try {
      await api.triggerQRScan(batchId);
      await loadData();
      const updated = await api.getBatch(batchId);
      setSelectedBatch(updated);
      setCurrentTab('qr_results');
    } catch (err) {
      console.error('Auto QR processing failed on upload:', err);
      setCurrentTab('qr_results');
    }
  };

  const candidateReviewCount = selectedBatch?.review_candidates ?? 0;
  const conflictCount = selectedBatch?.conflict_candidates ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar
        batches={batches}
        selectedBatch={selectedBatch}
        onSelectBatch={(b) => setSelectedBatch(b)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(prev => !prev)}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          candidateReviewCount={candidateReviewCount}
          conflictCount={conflictCount}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              batches={batches}
              selectedBatch={selectedBatch}
              onSelectBatch={(b) => setSelectedBatch(b)}
              onNavigate={(tab) => setCurrentTab(tab)}
              onTriggerQRScan={handleTriggerQRScan}
              isProcessing={isProcessing}
            />
          )}

          {currentTab === 'scanner' && (
            <ScannerConfig
              onScanSuccess={handleScanSuccess}
            />
          )}

          {currentTab === 'upload' && (
            <BulkUpload
              onUploadSuccess={handleUploadSuccess}
            />
          )}

          {currentTab === 'qr_results' && selectedBatch && (
            <QRValidationDashboard
              batch={selectedBatch}
              onNavigateExport={() => setCurrentTab('export')}
            />
          )}

          {currentTab === 'qr_results' && !selectedBatch && (
            <div className="text-center py-20 text-slate-400">
              No active batch selected. Upload documents or scan with ADF first.
            </div>
          )}

          {currentTab === 'export' && selectedBatch && (
            <PDFManagement
              batch={selectedBatch}
              onRefreshBatch={loadData}
            />
          )}

          {currentTab === 'export' && !selectedBatch && (
            <div className="text-center py-20 text-slate-400">
              No active batch selected. Upload documents or scan with ADF first.
            </div>
          )}

          {currentTab === 'history' && selectedBatch && (
            <HistoryView
              batch={selectedBatch}
            />
          )}

          {currentTab === 'history' && !selectedBatch && (
            <div className="text-center py-20 text-slate-400">
              No active batch selected.
            </div>
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

