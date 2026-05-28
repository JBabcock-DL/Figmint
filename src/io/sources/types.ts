export type ContractKind =
  | 'ops-program'
  | 'tokens-dtcg'
  | 'tokens-legacy'
  | 'component-spec'
  | 'drift-report'
  | 'handoff-context'
  | 'registry';

export const PASTE_MAX = 1_048_576;
export const RAW_SNIPPET_MAX = 1_024;

export interface LoadedDocument<T = unknown> {
  kind: ContractKind;
  payload: T;
  sourceMeta: SourceMeta;
  rawSnippet: string;
}

export type SourceMeta = PasteSourceMeta | FileSourceMeta | ClipboardSourceMeta | GitHubSourceMeta;

export interface PasteSourceMeta {
  port: 'paste';
  receivedAt: string;
  charLength: number;
}

export interface FileSourceMeta {
  port: 'file';
  receivedAt: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  lastModified: number;
  via: 'picker' | 'dragdrop';
}

export interface ClipboardSourceMeta {
  port: 'clipboard';
  receivedAt: string;
  charLength: number;
  mechanism: 'async-clipboard-api' | 'paste-event';
}

export interface GitHubSourceMeta {
  port: 'github';
  repoUrl: string;
  path: string;
  ref?: string;
  sha?: string;
  receivedAt: string;
}

export type ValidationErrorKind =
  | 'invalid-json'
  | 'unknown-contract'
  | 'ambiguous'
  | 'oversize'
  | 'empty'
  | 'unsupported-type';

export interface ValidationErrorLocationPaste {
  source: 'paste';
  line?: number;
  column?: number;
}

export interface ValidationErrorLocationFile {
  source: 'file';
  fileName: string;
  line?: number;
  column?: number;
}

export interface ValidationErrorLocationClipboard {
  source: 'clipboard';
}

export type ValidationErrorLocation =
  | ValidationErrorLocationPaste
  | ValidationErrorLocationFile
  | ValidationErrorLocationClipboard;

export interface ValidationError {
  kind: ValidationErrorKind;
  message: string;
  location: ValidationErrorLocation;
  hint?: string;
}

export interface ClipboardProbeResult {
  available: boolean;
  doc?: LoadedDocument;
  rawError?: string;
}
