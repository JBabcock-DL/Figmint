/// <reference types="@figma/plugin-typings" />

import type {
  AuditReportSummary,
  AuditReportV1,
  AuditRuleResult,
  AuditScope,
} from '@detroitlabs/figmint-contracts';

export type { AuditReportSummary, AuditReportV1, AuditRuleResult, AuditScope };

export interface FigmaVariableSnapshot {
  id: string;
  name: string;
  collectionId: string;
  collectionName: string;
  resolvedType: VariableResolvedDataType;
  valuesByMode: Record<string, VariableValue>;
  codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>;
}

export interface FigmaCollectionSnapshot {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variables: FigmaVariableSnapshot[];
}

/** Push counters consumed by audit rules — compatible with WO-008 PushResult.errors shape. */
export interface PushResult {
  created: number;
  updated: number;
  skipped: number;
  errors: readonly unknown[];
}

export type PushResultWithAudit = PushResult & { audit: AuditReportV1 };

export interface VariablesAuditInput {
  canonical: import('@detroitlabs/figmint-contracts').TokensV1;
  figmaCollections: FigmaCollectionSnapshot[];
  pushResult: PushResult;
}

export interface RuleInput {
  canonical: import('@detroitlabs/figmint-contracts').TokensV1;
  figmaCollections: FigmaCollectionSnapshot[];
  pushResult: PushResult;
}

export interface CanvasAuditInput {
  builder: 'text-styles' | 'token-overview' | 'layout' | 'effects';
  page?: PageNode;
  stats?: Record<string, number>;
  /** Vitest-only probe override when page walk is unavailable */
  probeOverride?: import('./probeCanvasPage').CanvasPageProbe;
}

export interface ComponentAuditInput {
  spec: import('@detroitlabs/figmint-contracts').ComponentSpecV1;
  componentSet: ComponentSetNode;
  bindingsResult?: import('@/core/components/scaffold/types').ApplyBindingsResult;
  applyPropertiesResult?: import('@/core/components/scaffold/types').ApplyPropertiesResult;
}
