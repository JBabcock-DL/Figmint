/// <reference types="@figma/plugin-typings" />

import type {
  ComponentDriftEntry,
  ComponentSpecBinding,
  ComponentSpecProp,
  VariableDriftEntry,
} from '@detroitlabs/fighub-contracts';

export type DriftDirection = 'push' | 'pull' | 'conflict' | 'synced';

export type UnsyncedDriftDirection = 'push' | 'pull' | 'conflict';

/** Maps detect-time direction to contract drift entry direction (synced rows are filtered earlier). */
export function toUnsyncedDriftDirection(direction: DriftDirection): UnsyncedDriftDirection {
  if (direction === 'synced') {
    throw new Error('expected non-synced drift direction');
  }
  return direction;
}

export interface VariableComparable {
  valuesByMode: Record<string, VariableValue>;
  codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>;
  resolvedType: VariableResolvedDataType;
}

export interface VariableDriftDetectInput {
  repoTokens: Record<string, VariableComparable>;
  figmaTokens: Record<string, VariableComparable>;
  snapshotTokens: Record<string, VariableComparable>;
  /** Per flattened variable key — used to ignore premature push snapshot rows. */
  snapshotSources?: Record<string, 'push' | 'pull'>;
}

export interface VariableDriftDetectResult {
  drifts: VariableDriftEntry[];
  syncedCount: number;
}

export interface ComponentComparable {
  specName: string;
  variantMatrixHash: string;
  variantMatrix?: Record<string, (string | boolean)[]>;
  props: ComponentSpecProp[];
  bindings: ComponentSpecBinding[];
  nodeId?: string;
  pageName?: string;
}

export interface ComponentDiff {
  variantMatrix?: { added: string[]; removed: string[]; hashFigma: string; hashRepo: string };
  props?: { added: ComponentSpecProp[]; removed: string[]; changed: string[] };
  bindings?: { added: ComponentSpecBinding[]; removed: ComponentSpecBinding[]; changed: string[] };
}

export interface ComponentDriftPayload {
  comparable: ComponentComparable;
  diff?: ComponentDiff;
}

export interface ComponentDriftDetectInput {
  repoSpecs: Record<string, ComponentComparable>;
  figmaComponents: Record<string, ComponentComparable>;
  snapshotComponents: Record<string, ComponentComparable>;
  options?: { quickDetect?: boolean };
}

export interface ComponentDriftDetectResult {
  drifts: ComponentDriftEntry[];
  syncedCount: number;
}
