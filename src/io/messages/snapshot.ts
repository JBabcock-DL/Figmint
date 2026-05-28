import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

export interface SnapshotReadMessage {
  type: 'snapshot/read';
  requestId: string;
}

export interface SnapshotReadResultMessage {
  type: 'snapshot/read/result';
  requestId: string;
  ok: boolean;
  registry?: RegistryV1;
  error?: string;
}

export interface SnapshotUpsertRegistryMessage {
  type: 'snapshot/upsert-registry';
  requestId: string;
  specName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isSnapshotReadMessage(message: unknown): message is SnapshotReadMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'snapshot/read' && typeof message.requestId === 'string';
}

export function isSnapshotReadResultMessage(message: unknown): message is SnapshotReadResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'snapshot/read/result' && typeof message.requestId === 'string';
}

export function isSnapshotUpsertRegistryMessage(
  message: unknown,
): message is SnapshotUpsertRegistryMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'snapshot/upsert-registry' &&
    typeof message.requestId === 'string' &&
    typeof message.specName === 'string'
  );
}
