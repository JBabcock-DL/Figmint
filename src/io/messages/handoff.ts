import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

export const HANDOFF_CAPTURE = 'handoff/capture' as const;
export const HANDOFF_CAPTURE_RESULT = 'handoff/capture-result' as const;
export const HANDOFF_SELECTION = 'handoff/selection' as const;

export interface HandoffCaptureMessage {
  type: typeof HANDOFF_CAPTURE;
  requestId: string;
}

export interface HandoffCaptureResultMessage {
  type: typeof HANDOFF_CAPTURE_RESULT;
  requestId: string;
  ok: boolean;
  markdown?: string;
  document?: HandoffContextV1;
  warnings?: string[];
  error?: string;
  durationMs?: number;
}

export interface HandoffSelectionMessage {
  type: typeof HANDOFF_SELECTION;
  count: number;
  names: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isHandoffCaptureMessage(message: unknown): message is HandoffCaptureMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === HANDOFF_CAPTURE && typeof message.requestId === 'string';
}

export function isHandoffCaptureResultMessage(
  message: unknown,
): message is HandoffCaptureResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== HANDOFF_CAPTURE_RESULT) {
    return false;
  }
  if (typeof message.requestId !== 'string' || typeof message.ok !== 'boolean') {
    return false;
  }
  if (message.markdown !== undefined && typeof message.markdown !== 'string') {
    return false;
  }
  if (message.error !== undefined && typeof message.error !== 'string') {
    return false;
  }
  if (message.durationMs !== undefined && typeof message.durationMs !== 'number') {
    return false;
  }
  if (message.warnings !== undefined) {
    if (!Array.isArray(message.warnings)) {
      return false;
    }
    for (let i = 0; i < message.warnings.length; i++) {
      if (typeof message.warnings[i] !== 'string') {
        return false;
      }
    }
  }
  return true;
}

export function isHandoffSelectionMessage(message: unknown): message is HandoffSelectionMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== HANDOFF_SELECTION) {
    return false;
  }
  if (typeof message.count !== 'number') {
    return false;
  }
  if (!Array.isArray(message.names)) {
    return false;
  }
  for (let i = 0; i < message.names.length; i++) {
    if (typeof message.names[i] !== 'string') {
      return false;
    }
  }
  return true;
}
