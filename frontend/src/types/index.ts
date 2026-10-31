export interface ScannedPage {
  id: number;
  batch_id: number;
  source_file_id: number;
  original_page_number: number;
  global_page_number: number;
  page_image_path?: string;
  qr_status: 'success' | 'qr_not_detected' | 'payload_unparsed' | 'conflict' | 'pending';
  raw_qr_payload?: string;
  decoder_info?: string;
  recognized_roll_number?: string; // Register Number
  recognized_name?: string;
  confidence_score: number;
  verification_status: string;
  is_blank: boolean;
  skew_angle: number;
}

export interface CandidatePageItem {
  id: number;
  page_order: number;
  scanned_page: ScannedPage;
}

export interface Candidate {
  id: number;
  batch_id: number;
  roll_number: string; // Register Number
  candidate_name: string;
  page_count: number; // Always 1
  pdf_path?: string;
  verification_status: 'verified' | 'review_required' | 'conflict';
  has_conflict: boolean;
  qr_status: string;
  notes?: string;
  pages: CandidatePageItem[];
}

export interface Batch {
  id: number;
  batch_name: string;
  examination_name: string;
  examination_date: string;
  total_pages: number;
  total_candidates: number;
  status: string;
  created_at: string;
  verified_candidates: number;
  review_candidates: number;
  conflict_candidates: number;
  zip_ready: boolean;
  zip_size_mb?: number;
  zip_path?: string;
}

export interface DashboardStats {
  total_batches: number;
  total_files: number;
  total_pages: number;
  total_candidates: number;
  decoded_qr_codes: number;
  failed_qr_detections: number;
  verified_candidates: number;
  review_candidates: number;
  conflict_candidates: number;
  pdfs_generated: number;
  recent_audit_logs: Array<{
    id: number;
    batch_id: number;
    candidate_id?: number;
    action: string;
    details?: string;
    operator: string;
    timestamp: string;
  }>;
}

export interface ScannerDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  max_speed_ppm: number;
  supported_dpi: number[];
  color_modes: string[];
  duplex_supported: boolean;
}

export interface ScannerConfigState {
  scanner_name: string;
  paper_size: string;
  resolution_dpi: number;
  color_mode: string;
  duplex: boolean;
  auto_rotate: boolean;
  blank_detection: boolean;
  deskew: boolean;
}
