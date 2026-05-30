import type { SinkFailureCode } from '@/io/sinks/types';

export const CODECONNECT_EMIT_PR = 'codeconnect/emit-pr' as const;
export const CODECONNECT_EMIT_PR_RESULT = 'codeconnect/emit-pr-result' as const;
export const CODECONNECT_DETECT = 'codeconnect/detect' as const;
export const CODECONNECT_DETECT_RESULT = 'codeconnect/detect/result' as const;
export const CODECONNECT_EMIT_PR_UI_RESULT = 'codeconnect/emit-pr/result' as const;

/** UI-facing unmapped component reference (WO-044). */
export interface UnmappedComponentRef {
  nodeId: string;
  name: string;
  componentSetName?: string;
  implementationPath?: string;
}

export interface CodeConnectDetectMessage {
  type: typeof CODECONNECT_DETECT;
  requestId: string;
  repoUrl: string;
  nodeIds?: string[];
}

export interface CodeConnectEmitPrMessage {
  type: typeof CODECONNECT_EMIT_PR;
  requestId: string;
  repoUrl: string;
  componentIds: string[];
  commitMessage?: string;
}

export interface CodeConnectDetectResultMessage {
  type: typeof CODECONNECT_DETECT_RESULT;
  requestId: string;
  ok: boolean;
  unmapped: UnmappedComponentRef[];
  error?: string;
}

export interface CodeConnectEmitPrResultMessage {
  type: typeof CODECONNECT_EMIT_PR_UI_RESULT;
  requestId: string;
  ok: boolean;
  prUrl?: string;
  error?: string;
  code?: SinkFailureCode;
}

export interface CodeConnectEmitPRRequest {
  type: typeof CODECONNECT_EMIT_PR;
  repoUrl: string;
  specsPath: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  framework: 'react';
  selectedNodeIds?: string[];
}

export interface CodeConnectEmitPRResult {
  type: typeof CODECONNECT_EMIT_PR_RESULT;
  ok: boolean;
  prUrl?: string;
  stubCount?: number;
  truncated?: boolean;
  code?: string;
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCodeConnectDetectMessage(msg: unknown): msg is CodeConnectDetectMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== CODECONNECT_DETECT) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.repoUrl !== 'string') {
    return false;
  }
  if (msg.nodeIds !== undefined) {
    if (!Array.isArray(msg.nodeIds)) {
      return false;
    }
    for (let i = 0; i < msg.nodeIds.length; i++) {
      if (typeof msg.nodeIds[i] !== 'string') {
        return false;
      }
    }
  }
  return true;
}

export function isCodeConnectEmitPrMessage(msg: unknown): msg is CodeConnectEmitPrMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== CODECONNECT_EMIT_PR) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.repoUrl !== 'string') {
    return false;
  }
  if (!Array.isArray(msg.componentIds)) {
    return false;
  }
  for (let i = 0; i < msg.componentIds.length; i++) {
    if (typeof msg.componentIds[i] !== 'string') {
      return false;
    }
  }
  if (msg.commitMessage !== undefined && typeof msg.commitMessage !== 'string') {
    return false;
  }
  return true;
}

export function isCodeConnectDetectResultMessage(
  msg: unknown,
): msg is CodeConnectDetectResultMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== CODECONNECT_DETECT_RESULT) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.ok !== 'boolean') {
    return false;
  }
  if (!Array.isArray(msg.unmapped)) {
    return false;
  }
  if (msg.error !== undefined && typeof msg.error !== 'string') {
    return false;
  }
  return true;
}

export function isCodeConnectEmitPrResultMessage(
  msg: unknown,
): msg is CodeConnectEmitPrResultMessage {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== CODECONNECT_EMIT_PR_UI_RESULT) {
    return false;
  }
  if (typeof msg.requestId !== 'string' || typeof msg.ok !== 'boolean') {
    return false;
  }
  if (msg.prUrl !== undefined && typeof msg.prUrl !== 'string') {
    return false;
  }
  if (msg.error !== undefined && typeof msg.error !== 'string') {
    return false;
  }
  return true;
}

/** Legacy WO-040 emit request (owner/repo/specsPath shape). */
export function isCodeConnectEmitPRRequest(msg: unknown): msg is CodeConnectEmitPRRequest {
  if (!isRecord(msg)) {
    return false;
  }
  if (msg.type !== CODECONNECT_EMIT_PR) {
    return false;
  }
  if (typeof msg.requestId === 'string') {
    return false;
  }
  if (typeof msg.repoUrl !== 'string') {
    return false;
  }
  if (typeof msg.specsPath !== 'string') {
    return false;
  }
  if (typeof msg.owner !== 'string') {
    return false;
  }
  if (typeof msg.repo !== 'string') {
    return false;
  }
  if (typeof msg.defaultBranch !== 'string') {
    return false;
  }
  if (msg.framework !== 'react') {
    return false;
  }
  if (msg.selectedNodeIds !== undefined) {
    if (!Array.isArray(msg.selectedNodeIds)) {
      return false;
    }
    for (let i = 0; i < msg.selectedNodeIds.length; i++) {
      if (typeof msg.selectedNodeIds[i] !== 'string') {
        return false;
      }
    }
  }
  return true;
}
