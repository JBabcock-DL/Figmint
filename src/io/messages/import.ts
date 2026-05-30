import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

import type { DependencyTree } from '@/core/import/shared/types';
import { isComponentFramework } from '@/core/import/shared/importSourceExtensions';

export const IMPORT_LIST_FILES = 'import/list-files' as const;
export const IMPORT_LIST_FILES_RESULT = 'import/list-files/result' as const;
export const IMPORT_PARSE = 'import/parse' as const;
export const IMPORT_PARSE_RESULT = 'import/parse/result' as const;
/** Main → UI: run TS parser in UI iframe (typescript must not load in code.js). */
export const IMPORT_PARSE_EXEC = 'import/parse/exec' as const;
/** UI → main: parser output forwarded as import/parse/result. */
export const IMPORT_PARSE_EXEC_RESULT = 'import/parse/exec-result' as const;

export interface ImportListFilesMessage {
  type: typeof IMPORT_LIST_FILES;
  requestId: string;
  repoUrl: string;
  /** default: parent of specsPath or 'components/' */
  rootPath?: string;
  /** Source framework — controls which extensions are listed (default react). */
  framework?: ComponentFramework;
}

export interface ImportParseMessage {
  type: typeof IMPORT_PARSE;
  requestId: string;
  repoUrl: string;
  sourcePath: string;
  figmaMappingPath?: string;
}

export interface ImportParseIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ImportListFilesResultMessage {
  type: typeof IMPORT_LIST_FILES_RESULT;
  requestId: string;
  ok: boolean;
  files: { path: string; name: string }[];
  truncated?: boolean;
  error?: string;
}

export interface ImportParseResultMessage {
  type: typeof IMPORT_PARSE_RESULT;
  requestId: string;
  ok: boolean;
  spec?: ComponentSpecV1;
  dependencyTree?: DependencyTree;
  issues?: ImportParseIssue[];
  error?: string;
}

/** Serializable parse context — token maps only (no TokenResolver object). */
export interface ImportParseExecMessage {
  type: typeof IMPORT_PARSE_EXEC;
  requestId: string;
  sourcePath: string;
  sourceText: string;
  figmaMappingText?: string;
  registryKeys: readonly string[];
  classToVariable: Record<string, string>;
  manualMap?: Record<string, string>;
}

export interface ImportParseExecResultMessage {
  type: typeof IMPORT_PARSE_EXEC_RESULT;
  requestId: string;
  ok: boolean;
  spec?: ComponentSpecV1;
  dependencyTree?: DependencyTree;
  issues?: ImportParseIssue[];
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFileEntry(value: unknown): value is { path: string; name: string } {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.path === 'string' && typeof value.name === 'string';
}

export function isImportListFilesMessage(msg: unknown): msg is ImportListFilesMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== IMPORT_LIST_FILES) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.repoUrl !== 'string') {
    return false;
  }
  if (msg.rootPath !== undefined && typeof msg.rootPath !== 'string') {
    return false;
  }
  if (msg.framework !== undefined && !isComponentFramework(msg.framework)) {
    return false;
  }
  return true;
}

export function isImportParseMessage(msg: unknown): msg is ImportParseMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== IMPORT_PARSE) {
    return false;
  }
  if (
    typeof msg.requestId !== 'string' ||
    typeof msg.repoUrl !== 'string' ||
    typeof msg.sourcePath !== 'string'
  ) {
    return false;
  }
  if (msg.figmaMappingPath !== undefined && typeof msg.figmaMappingPath !== 'string') {
    return false;
  }
  return true;
}

export function isImportListFilesResultMessage(
  msg: unknown,
): msg is ImportListFilesResultMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== IMPORT_LIST_FILES_RESULT) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.ok !== 'boolean') {
    return false;
  }
  if (!Array.isArray(msg.files)) {
    return false;
  }
  for (let i = 0; i < msg.files.length; i++) {
    if (!isFileEntry(msg.files[i])) {
      return false;
    }
  }
  if (msg.truncated !== undefined && typeof msg.truncated !== 'boolean') {
    return false;
  }
  if (msg.error !== undefined && typeof msg.error !== 'string') {
    return false;
  }
  return true;
}

export function isImportParseResultMessage(msg: unknown): msg is ImportParseResultMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== IMPORT_PARSE_RESULT) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.ok !== 'boolean') {
    return false;
  }
  if (msg.error !== undefined && typeof msg.error !== 'string') {
    return false;
  }
  return true;
}

export function isImportParseExecMessage(msg: unknown): msg is ImportParseExecMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== IMPORT_PARSE_EXEC) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.sourcePath !== 'string') {
    return false;
  }
  if (typeof msg.sourceText !== 'string') {
    return false;
  }
  if (msg.figmaMappingText !== undefined && typeof msg.figmaMappingText !== 'string') {
    return false;
  }
  if (!Array.isArray(msg.registryKeys)) {
    return false;
  }
  if (!isRecord(msg.classToVariable)) {
    return false;
  }
  if (msg.manualMap !== undefined && !isRecord(msg.manualMap)) {
    return false;
  }
  return true;
}

export function isImportParseExecResultMessage(
  msg: unknown,
): msg is ImportParseExecResultMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== IMPORT_PARSE_EXEC_RESULT) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.ok !== 'boolean') {
    return false;
  }
  if (msg.error !== undefined && typeof msg.error !== 'string') {
    return false;
  }
  return true;
}
