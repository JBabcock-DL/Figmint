import type { FigmaFileKeySource } from '@/core/figma/resolveFileKey';

export const FIGMA_FILE_KEY_LOAD = 'figma-file-key/load' as const;
export const FIGMA_FILE_KEY_LOADED = 'figma-file-key/loaded' as const;
export const FIGMA_FILE_KEY_SAVE = 'figma-file-key/save' as const;
export const FIGMA_FILE_KEY_CLEAR = 'figma-file-key/clear' as const;
export const FIGMA_FILE_KEY_CHANGED = 'figma-file-key/changed' as const;

export interface FigmaFileKeyLoadMessage {
  type: typeof FIGMA_FILE_KEY_LOAD;
  requestId: string;
}

export interface FigmaFileKeyLoadedMessage {
  type: typeof FIGMA_FILE_KEY_LOADED;
  requestId: string;
  ok: boolean;
  fileKey?: string;
  source?: FigmaFileKeySource;
  override?: string;
  error?: string;
}

export interface FigmaFileKeySaveMessage {
  type: typeof FIGMA_FILE_KEY_SAVE;
  requestId: string;
  input: string;
}

export interface FigmaFileKeyClearMessage {
  type: typeof FIGMA_FILE_KEY_CLEAR;
  requestId: string;
}

export interface FigmaFileKeyChangedMessage {
  type: typeof FIGMA_FILE_KEY_CHANGED;
  fileKey: string;
  source: FigmaFileKeySource;
  override: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFigmaFileKeySource(value: unknown): value is FigmaFileKeySource {
  return value === 'api' || value === 'override' || value === 'none';
}

export function isFigmaFileKeyLoadMessage(message: unknown): message is FigmaFileKeyLoadMessage {
  return (
    isRecord(message) &&
    message.type === FIGMA_FILE_KEY_LOAD &&
    typeof message.requestId === 'string'
  );
}

export function isFigmaFileKeySaveMessage(message: unknown): message is FigmaFileKeySaveMessage {
  return (
    isRecord(message) &&
    message.type === FIGMA_FILE_KEY_SAVE &&
    typeof message.requestId === 'string' &&
    typeof message.input === 'string'
  );
}

export function isFigmaFileKeyClearMessage(message: unknown): message is FigmaFileKeyClearMessage {
  return (
    isRecord(message) &&
    message.type === FIGMA_FILE_KEY_CLEAR &&
    typeof message.requestId === 'string'
  );
}

export function isFigmaFileKeyLoadedMessage(message: unknown): message is FigmaFileKeyLoadedMessage {
  if (!isRecord(message) || message.type !== FIGMA_FILE_KEY_LOADED) {
    return false;
  }
  if (typeof message.requestId !== 'string' || typeof message.ok !== 'boolean') {
    return false;
  }
  if (message.ok === false) {
    return typeof message.error === 'string';
  }
  return (
    typeof message.fileKey === 'string' &&
    isFigmaFileKeySource(message.source) &&
    typeof message.override === 'string'
  );
}

export function isFigmaFileKeyChangedMessage(
  message: unknown,
): message is FigmaFileKeyChangedMessage {
  if (!isRecord(message) || message.type !== FIGMA_FILE_KEY_CHANGED) {
    return false;
  }
  return (
    typeof message.fileKey === 'string' &&
    isFigmaFileKeySource(message.source) &&
    typeof message.override === 'string'
  );
}
