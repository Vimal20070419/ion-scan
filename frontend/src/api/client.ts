import { Batch, Candidate, DashboardStats, ScannedPage, ScannerDevice, ScannerConfigState } from '../types';

const API_BASE = '/api';

export const api = {
  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async getAuditLogs(batchId: number) {
    const res = await fetch(`${API_BASE}/stats/audit-logs/${batchId}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Batches
  async getBatches(): Promise<Batch[]> {
    const res = await fetch(`${API_BASE}/batches`);
    if (!res.ok) throw new Error('Failed to fetch batches');
    return res.json();
  },

  async getBatch(batchId: number): Promise<Batch> {
    const res = await fetch(`${API_BASE}/batches/${batchId}`);
    if (!res.ok) throw new Error('Failed to fetch batch');
    return res.json();
  },

  async deleteBatch(batchId: number) {
    const res = await fetch(`${API_BASE}/batches/${batchId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete batch');
    return res.json();
  },

  // Upload
  async uploadFiles(formData: FormData) {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  // Scanner
  async getScannerDevices(): Promise<ScannerDevice[]> {
    const res = await fetch(`${API_BASE}/scanner/devices`);
    if (!res.ok) throw new Error('Failed to fetch scanner devices');
    return res.json();
  },

  async triggerScan(config: ScannerConfigState, batchName?: string) {
    const res = await fetch(`${API_BASE}/scanner/scan?batch_name=${encodeURIComponent(batchName || 'ADF_QR_Scan_Stack')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Scanner feed acquisition failed');
    return res.json();
  },

  // QR Scanning & Decoding (Replaced OCR)
  async triggerQRScan(batchId: number) {
    const res = await fetch(`${API_BASE}/qr/process/${batchId}`, { method: 'POST' });
    if (!res.ok) throw new Error('QR detection pipeline failed');
    return res.json();
  },

  async retryPageQR(pageId: number) {
    const res = await fetch(`${API_BASE}/qr/retry-page/${pageId}`, { method: 'POST' });
    if (!res.ok) throw new Error('QR retry failed');
    return res.json();
  },

  async getBatchPages(batchId: number): Promise<ScannedPage[]> {
    const res = await fetch(`${API_BASE}/ocr/pages/${batchId}`);
    if (!res.ok) throw new Error('Failed to fetch batch pages');
    return res.json();
  },

  // Candidates & Register Numbers
  async getCandidates(batchId: number): Promise<Candidate[]> {
    const res = await fetch(`${API_BASE}/candidates/batch/${batchId}`);
    if (!res.ok) throw new Error('Failed to fetch candidates');
    return res.json();
  },

  async updateCandidate(candidateId: number, data: Partial<Candidate>): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update candidate');
    return res.json();
  },

  async deleteCandidate(candidateId: number) {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete candidate record');
    return res.json();
  },

  // Export
  async generatePDFs(batchId: number, includeReview: boolean = true) {
    const res = await fetch(`${API_BASE}/export/batch/${batchId}/generate-pdfs?include_review=${includeReview}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to generate PDFs');
    }
    return res.json();
  },

  async generateZIP(batchId: number) {
    const res = await fetch(`${API_BASE}/export/batch/${batchId}/generate-zip`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to generate ZIP archive');
    }
    return res.json();
  },

  getZipDownloadUrl(batchId: number) {
    return `${API_BASE}/export/batch/${batchId}/download-zip`;
  },

  getCsvExportUrl(batchId: number) {
    return `${API_BASE}/export/batch/${batchId}/export-csv`;
  },

  getCandidatePdfDownloadUrl(candidateId: number) {
    return `${API_BASE}/export/candidate/${candidateId}/download`;
  }
};
