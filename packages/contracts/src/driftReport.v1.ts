export interface DriftReportMeta {
  generatedAt: string;
  figmaFileKey: string;
  repoUrl: string;
}

export interface DriftReportSummary {
  push: number;
  pull: number;
  conflict: number;
  synced: number;
}

export interface VariableDriftEntry {
  id: string;
  kind: 'variable';
  direction: 'push' | 'pull' | 'conflict';
  figma: unknown;
  repo: unknown;
  lastSynced: unknown;
}

export interface ComponentDriftEntry {
  id: string;
  kind: 'component';
  direction: 'push' | 'pull' | 'conflict';
  figma: unknown;
  repo: unknown;
  lastSynced: unknown;
}

export type DriftEntry = VariableDriftEntry | ComponentDriftEntry;

export interface DriftReportV1 {
  v: 1;
  kind: 'drift-report';
  meta: DriftReportMeta;
  summary: DriftReportSummary;
  drifts: DriftEntry[];
}
