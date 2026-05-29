import type { ContractKind } from '@/io/sources/types';

import type { FormatOptions, SerializableDocument, SinkResult } from '@/io/sinks/types';

export interface SinkOutputPageMessage {
  type: 'sink/output-page';
  requestId: string;
  doc: SerializableDocument;
  options: FormatOptions;
}

export interface SinkPluginDataMessage {
  type: 'sink/plugin-data';
  requestId: string;
  doc: SerializableDocument;
  options: FormatOptions;
}

export interface SinkResultMessage {
  type: 'sink/result';
  requestId: string;
  result: SinkResult;
}

export interface SinkErrorMessage {
  type: 'sink/error';
  requestId: string;
  message: string;
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
  for (const kind of CONTRACT_KINDS) {
    if (kind === value) {
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

function isSinkResult(value: unknown): value is SinkResult {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.ok !== 'boolean') {
    return false;
  }
  if (
    value.sink !== 'download' &&
    value.sink !== 'clipboard' &&
    value.sink !== 'output-page' &&
    value.sink !== 'plugin-data'
  ) {
    return false;
  }
  if (typeof value.message !== 'string') {
    return false;
  }
  if (value.error !== undefined && typeof value.error !== 'string') {
    return false;
  }
  return true;
}

export function isSinkOutputPageMessage(message: unknown): message is SinkOutputPageMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'sink/output-page') {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (!isSerializableDocument(message.doc)) {
    return false;
  }
  if (!isFormatOptions(message.options)) {
    return false;
  }
  return true;
}

export function isSinkPluginDataMessage(message: unknown): message is SinkPluginDataMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'sink/plugin-data') {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (!isSerializableDocument(message.doc)) {
    return false;
  }
  if (!isFormatOptions(message.options)) {
    return false;
  }
  return true;
}

export function isSinkResultMessage(message: unknown): message is SinkResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'sink/result') {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (!isSinkResult(message.result)) {
    return false;
  }
  return true;
}

export function isSinkErrorMessage(message: unknown): message is SinkErrorMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'sink/error') {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (typeof message.message !== 'string') {
    return false;
  }
  return true;
}
