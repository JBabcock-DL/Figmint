import type { ContractKind } from '@/io/sources/types';

import type {
  FormatOptions,
  GithubPRSinkOptions,
  SerializableDocument,
  SinkFailureCode,
  SinkId,
} from '@/io/sinks/types';

export interface ExportGithubPRPayload {
  repoUrl: string;
  githubPROptions: GithubPRSinkOptions;
  files: { path: string; content: string }[];
  contractKind: string;
}

export type ExportMainSinkId = 'output-page' | 'plugin-data' | 'github-pr';

export interface ExportRunMessage {
  type: 'export/run';
  requestId: string;
  sinks: ExportMainSinkId[];
  doc: SerializableDocument;
  formatOptions: FormatOptions;
  files: { path: string; content: string; format: 'json' | 'md' }[];
  githubPR?: ExportGithubPRPayload;
}

export interface ExportSinkResultMessage {
  type: 'export/sink-result';
  requestId: string;
  sink: SinkId;
  ok: boolean;
  message?: string;
  error?: string;
  code?: SinkFailureCode;
}

export interface ExportBySinkResult {
  ok: boolean;
  message?: string;
  error?: string;
  code?: SinkFailureCode;
}

export interface ExportCompleteMessage {
  type: 'export/complete';
  requestId: string;
  bySink: Partial<Record<SinkId, ExportBySinkResult>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOutputFormat(value: unknown): value is 'json' | 'md' {
  return value === 'json' || value === 'md';
}

function isFormatOptions(value: unknown): value is FormatOptions {
  if (!isRecord(value)) {
    return false;
  }
  if (value.format !== 'json' && value.format !== 'md' && value.format !== 'both') {
    return false;
  }
  if (value.primaryFormat !== undefined && !isOutputFormat(value.primaryFormat)) {
    return false;
  }
  if (value.baseName !== undefined && typeof value.baseName !== 'string') {
    return false;
  }
  if (value.label !== undefined && typeof value.label !== 'string') {
    return false;
  }
  return true;
}

const CONTRACT_KINDS: ContractKind[] = [
  'ops-program',
  'tokens-dtcg',
  'tokens-legacy',
  'component-spec',
  'drift-report',
  'handoff-context',
  'registry',
];

function isContractKind(value: unknown): value is ContractKind {
  if (typeof value !== 'string') {
    return false;
  }
  for (let i = 0; i < CONTRACT_KINDS.length; i++) {
    if (CONTRACT_KINDS[i] === value) {
      return true;
    }
  }
  return false;
}

function isSerializableDocument(value: unknown): value is SerializableDocument {
  if (!isRecord(value)) {
    return false;
  }
  if (!isContractKind(value.kind)) {
    return false;
  }
  return 'payload' in value;
}

function isExportMainSinkId(value: unknown): value is ExportMainSinkId {
  return value === 'output-page' || value === 'plugin-data' || value === 'github-pr';
}

function isExportFileEntry(
  value: unknown,
): value is { path: string; content: string; format: 'json' | 'md' } {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.path !== 'string' || typeof value.content !== 'string') {
    return false;
  }
  return isOutputFormat(value.format);
}

function isGithubPRSinkOptions(value: unknown): value is GithubPRSinkOptions {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.owner !== 'string' || typeof value.repo !== 'string') {
    return false;
  }
  if (typeof value.baseBranch !== 'string' || typeof value.commitMessage !== 'string') {
    return false;
  }
  if (value.branchPattern !== undefined && typeof value.branchPattern !== 'string') {
    return false;
  }
  if (value.headBranch !== undefined && typeof value.headBranch !== 'string') {
    return false;
  }
  if (value.prTitle !== undefined && typeof value.prTitle !== 'string') {
    return false;
  }
  return true;
}

function isGithubPRFileEntry(value: unknown): value is { path: string; content: string } {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.path === 'string' && typeof value.content === 'string';
}

function isExportGithubPRPayload(value: unknown): value is ExportGithubPRPayload {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.repoUrl !== 'string' || typeof value.contractKind !== 'string') {
    return false;
  }
  if (!isGithubPRSinkOptions(value.githubPROptions)) {
    return false;
  }
  if (!Array.isArray(value.files)) {
    return false;
  }
  for (let i = 0; i < value.files.length; i++) {
    if (!isGithubPRFileEntry(value.files[i])) {
      return false;
    }
  }
  return true;
}

export function isExportRunMessage(message: unknown): message is ExportRunMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'export/run') {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (!Array.isArray(message.sinks)) {
    return false;
  }
  for (let i = 0; i < message.sinks.length; i++) {
    if (!isExportMainSinkId(message.sinks[i])) {
      return false;
    }
  }
  if (!isSerializableDocument(message.doc)) {
    return false;
  }
  if (!isFormatOptions(message.formatOptions)) {
    return false;
  }
  if (!Array.isArray(message.files)) {
    return false;
  }
  for (let i = 0; i < message.files.length; i++) {
    if (!isExportFileEntry(message.files[i])) {
      return false;
    }
  }
  if (message.githubPR !== undefined && !isExportGithubPRPayload(message.githubPR)) {
    return false;
  }
  return true;
}

const SINK_FAILURE_CODES: SinkFailureCode[] = [
  'auth-required',
  'auth-expired',
  'branch-exists',
  'conflict',
  'forbidden',
  'not-found',
  'network',
  'unavailable',
];

function isSinkFailureCode(value: unknown): value is SinkFailureCode {
  if (typeof value !== 'string') {
    return false;
  }
  for (let i = 0; i < SINK_FAILURE_CODES.length; i++) {
    if (SINK_FAILURE_CODES[i] === value) {
      return true;
    }
  }
  return false;
}

function isExportBySinkResult(value: unknown): value is ExportBySinkResult {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.ok !== 'boolean') {
    return false;
  }
  if (value.message !== undefined && typeof value.message !== 'string') {
    return false;
  }
  if (value.error !== undefined && typeof value.error !== 'string') {
    return false;
  }
  if (value.code !== undefined && !isSinkFailureCode(value.code)) {
    return false;
  }
  return true;
}

export function isExportSinkResultMessage(message: unknown): message is ExportSinkResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'export/sink-result') {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (
    message.sink !== 'download' &&
    message.sink !== 'clipboard' &&
    message.sink !== 'output-page' &&
    message.sink !== 'plugin-data' &&
    message.sink !== 'github-pr'
  ) {
    return false;
  }
  if (typeof message.ok !== 'boolean') {
    return false;
  }
  if (message.message !== undefined && typeof message.message !== 'string') {
    return false;
  }
  if (message.error !== undefined && typeof message.error !== 'string') {
    return false;
  }
  if (message.code !== undefined && !isSinkFailureCode(message.code)) {
    return false;
  }
  return true;
}

export function isExportCompleteMessage(message: unknown): message is ExportCompleteMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'export/complete') {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (!isRecord(message.bySink)) {
    return false;
  }
  for (const key of Object.keys(message.bySink)) {
    if (!isExportBySinkResult(message.bySink[key])) {
      return false;
    }
  }
  return true;
}
