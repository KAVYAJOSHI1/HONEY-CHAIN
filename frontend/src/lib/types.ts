export type HiveStatus = "HEALTHY" | "WATCH" | "WARNING" | "CRITICAL";
export type Severity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface Hive {
  id: number;
  owner_id: number;
  cluster_id: number;
  cluster_name: string | null;
  region: string | null;
  gps_lat: number;
  gps_long: number;
  status: HiveStatus;
  health_score: number;
  installed_at: string | null;
  latest_temperature: number | null;
  latest_humidity: number | null;
  latest_weight: number | null;
  harvest_ready: boolean;
  last_seen: string | null;
  online: boolean;
  beekeeper?: string | null;
}

export interface Cluster {
  id: number;
  name: string;
  region: string;
  total_hives: number;
  healthy: number;
  watch: number;
  warning: number;
  critical: number;
  avg_health: number | null;
  avg_temperature: number | null;
  avg_humidity: number | null;
  harvest_ready: number;
  center: { lat: number | null; lng: number | null };
  hives: Hive[];
}

export interface Telemetry {
  id: number;
  hive_id: number;
  temperature: number;
  humidity: number;
  weight: number;
  timestamp: string;
}

export interface HealthFactors {
  temperature: number;
  humidity: number;
  weight: number;
  anomalies: number;
  disease_risk: number;
}

export interface Health {
  hive_id: number;
  health_score: number;
  status: HiveStatus;
  factors: HealthFactors;
  alerts: string[];
  recommendations: string[];
  score_explanation: string;
}

export interface Productivity {
  hive_id: number;
  current_weight_kg: number;
  predicted_yield_kg: number;
  weight_change_kg: number;
  confidence: number;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  harvest_ready: boolean;
  harvest_window: string;
  factors: string[];
  label: string;
}

export interface Recommendation {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  hive_id: number;
  title: string;
  explanation: string;
  actions: string[];
  source: string;
}

export interface Analysis {
  id: number;
  hive_id: number;
  health_score: number;
  infection_rate: number;
  varroa_count: number;
  healthy_bee_count: number;
  image_ref: string | null;
  timestamp: string;
}

export interface Detection {
  class: string;
  confidence: number;
  bbox: number[];
  bbox_norm: [number, number, number, number];
}

export interface FrameResult {
  status: string;
  model?: string;
  regions_analyzed?: number;
  varroa_probability?: number;
  image_width: number;
  image_height: number;
  mite_count: number;
  bee_count: number;
  infection_rate_percentage: number;
  health_score: number;
  detections: Detection[];
}

export interface Alert {
  id: number;
  hive_id: number;
  type: string;
  severity: Severity;
  reason: string;
  message: string | null;
  source: string | null;
  current_value: number | null;
  acknowledged: boolean;
  resolved: boolean;
  timestamp: string;
}

export interface BatchOrigin {
  hive_id: number;
  apiary: string | null;
  region: string | null;
  gps_lat: number | null;
  gps_long: number | null;
  beekeeper: string | null;
}

export interface Batch {
  id: number;
  batch_id: string;
  hive_id: number;
  token_id: string;
  ipfs_cid: string;
  tx_hash: string;
  data_hash: string | null;
  health_score: number;
  floral_source: string;
  weight_kg: number;
  tampered_health_score: number | null;
  is_revoked: boolean;
  revocation_reason: string | null;
  blockchain_mode: string;
  created_at: string;
  updated_at: string;
  verification_url: string;
  qr_url: string;
  origin?: BatchOrigin;
  qr_code?: string;
}

export interface Integrity {
  verified: boolean;
  current_hash: string;
  anchored_hash: string;
  is_tampered: boolean;
  is_revoked: boolean;
  revocation_reason: string | null;
  status: string;
}

export interface TimelineEvent {
  key?: string;
  stage?: string;
  title: string;
  timestamp: string | null;
  detail?: string;
  data?: string;
  actor?: string;
  location?: string;
  verification?: string;
}

export interface TimelineResponse {
  batch_id?: string;
  hive_id?: number;
  token_id?: string;
  is_revoked?: boolean;
  timeline?: TimelineEvent[];
}

export interface Kpis {
  total_hives: number;
  total_batches: number;
  revoked_batches: number;
  alerts: number;
  critical_alerts: number;
  harvest_ready_hives: number;
  clusters: number;
}

export interface SystemHealth {
  backend: string;
  database: string;
  database_engine: string;
  yolo_model: string;
  varroa_model?: "TRAINED" | "SIMULATED";
  isolation_forest: string;
  blockchain_mode: string;
  ipfs_mode: string;
  websocket: string;
  websocket_clients: number;
  latency_ms: number;
  last_telemetry: string | null;
  version: string;
}

export interface Notification {
  id: number;
  message: string;
  is_read: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  action: string;
  actor: string;
  details: string;
  blockchain_tx: string | null;
  timestamp: string;
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  severity: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface SecurityReport {
  security_status: {
    database_integrity: string;
    blockchain_verification: string;
    qr_integrity: string;
    batches_checked: number;
    integrity_mismatches: number;
    revoked_batches: number;
    tamper_events: number;
    failed_verification: number;
    suspicious_activity: number;
  };
  batches: (Integrity & { batch_id: string; floral_source: string })[];
  events: SecurityEvent[];
}

export interface Analytics {
  production: {
    total_honey_produced_kg: number;
    avg_yield_per_hive_kg: number;
    harvest_ready_hives: number;
    production_trend: string;
    by_floral_source: { floral_source: string; weight_kg: number; batches: number }[];
  };
  hive_health: Record<"healthy" | "watch" | "warning" | "critical", number> &
    Record<"healthy_pct" | "watch_pct" | "warning_pct" | "critical_pct", number>;
  disease: { total_varroa_detections: number; inspections: number; disease_risk_hives: number; disease_trend: string };
  iot: { active_devices: number; offline_devices: number; telemetry_points_ingested: number; anomalies_detected: number; open_alerts: number };
  blockchain: { batches_minted: number; verified_batches: number; revoked_batches: number };
  consumer: { verification_attempts: number; failed_verifications: number; success_rate_pct: number | null };
}

export interface AiInsights {
  hive_intelligence: { hive_id: number; cluster_name: string | null; health_score: number; status: HiveStatus; score_explanation: string; factors: HealthFactors }[];
  disease_intelligence: { hive_id: number; varroa_count: number; infection_rate: number; healthy_bee_count: number; health_score: number; timestamp: string }[];
  productivity_intelligence: { hive_id: number; current_weight_kg: number; predicted_yield_kg: number; trend: string; harvest_ready: boolean; harvest_window: string }[];
  recommendations: Recommendation[];
}

export interface SearchResults {
  hives: { id: number; status: string; cluster_name: string | null }[];
  batches: { id: number; batch_id: string; floral_source: string; is_revoked: boolean }[];
  clusters: { id: number; name: string; region: string }[];
}
