import type {
  ComponentSpecV1,
  DriftReportV1,
  HandoffContextV1,
  OpsProgramV1,
  RegistryV1,
  TokensV1,
} from '@detroitlabs/fighub-contracts';

import type { SinkId } from '@/io/sinks/types';

/** Canonical document ready for serialization — output path, not wire ingest. */
export type ContractDocument =
  | { kind: 'ops-program'; payload: OpsProgramV1 }
  | { kind: 'component-spec'; payload: ComponentSpecV1 }
  | { kind: 'drift-report'; payload: DriftReportV1 }
  | { kind: 'handoff-context'; payload: HandoffContextV1 }
  | { kind: 'registry'; payload: RegistryV1 }
  | { kind: 'tokens'; payload: TokensV1 };

export interface ExportFormatSelection { json: boolean; md: boolean }

export type ExportSinkSelection = Record<SinkId, boolean>;

export interface ExportResults {
  requestId: string;
  bySink: Partial<Record<SinkId, { ok: boolean; message?: string; error?: string }>>;
}

export interface ExportSheetProps {
  document: ContractDocument;
  defaultSinks?: SinkId[];
  title?: string;
  onComplete?: (results: ExportResults) => void;
  onCancel?: () => void;
}
