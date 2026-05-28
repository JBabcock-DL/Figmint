import type { AuditRuleResult, ComponentSpecV1, RegistryV1 } from '@detroitlabs/figmint-contracts';

/** Parsed binding kind — suffix of selector after final '.' */
export type BindingKind =
  | 'fill'
  | 'stroke'
  | 'radius'
  | 'padding'
  | 'gap'
  | 'text-style';

export type BindingFailureReason =
  | 'missing-variable'
  | 'missing-node'
  | 'type-mismatch'
  | 'api-error';

export interface BindingFailure {
  selector: string;
  variable: string;
  reason: BindingFailureReason;
  diagnostic: string;
}

export interface ApplyBindingsResult {
  /** bindings.length × variant count when every entry applied cleanly */
  applied: number;
  failed: BindingFailure[];
  /** true iff failed.length === 0 */
  passed: boolean;
}

export interface ApplyBindingsOptions {
  /** When omitted, built via ensureLocalVariableMap() on main thread */
  variableMap?: import('@/core/canvas/lib/variables').VariablePathMap;
}

export interface ComponentAuditInput {
  spec: ComponentSpecV1;
  componentSet: ComponentSetNode;
  bindingsResult?: ApplyBindingsResult;
  applyPropertiesResult?: ApplyPropertiesResult;
}

export type VariantCombo = Record<string, string | boolean>;

export interface ExpandedVariant {
  name: string;
  combo: VariantCombo;
}

export interface ScaffoldOptions {
  registry?: RegistryV1;
  displayTitle?: string;
}

export interface ScaffoldBuildContext {
  spec: ComponentSpecV1;
  displayTitle: string;
  combo: VariantCombo;
  variantName: string;
  registry?: RegistryV1;
  fills: { primary: RGB; onPrimary: RGB; surface: RGB; outline: RGB };
  spacing: { padH: number; padV: number; gap: number; iconSize: number };
  fonts: { labelFamily: string; labelStyle: string };
  styleByVariantKey: Record<string, { fill: RGB; text: RGB }>;
}

export interface VariantBuildResult {
  component: ComponentNode;
  warnings?: string[];
}

export interface ScaffoldResult {
  componentSet: ComponentSetNode;
  variantCount: number;
  variantByKey: Record<string, ComponentNode>;
  replacedExisting: boolean;
  scaffoldId: string;
  auditRows: AuditRuleResult[];
  unresolvedTokens: string[];
}

export type ArchetypeBuilder = (ctx: ScaffoldBuildContext) => Promise<VariantBuildResult>;

export const PLUGIN_DATA_SCAFFOLD_ID = 'figmint.scaffoldId';
export const PLUGIN_DATA_SPEC_VERSION = 'figmint.specVersion';
export const PLUGIN_DATA_USAGE_FRAME = 'figmint.usageFrame';

import type { ComponentScaffoldTarget } from './ensureComponentScaffoldTarget';

export interface UsageFrameContext {
  /** Hosting Foundations page (`↳ Buttons`, …). */
  targetPage?: PageNode;
  /** `doc/component/{kebab}` root — preferred placement for set + usage. */
  docRoot?: FrameNode;
  /** Full page + doc target from `ensureComponentScaffoldTarget`. */
  scaffoldTarget?: ComponentScaffoldTarget;
  fontsLoaded?: boolean;
  labelFont?: FontName;
  maxInstances?: number;
  variantByKey?: Record<string, ComponentNode>;
  applyPropertiesResult?: ApplyPropertiesResult;
  scaffoldId?: string;
}

export interface UsageFrameResult {
  ok: boolean;
  frame: FrameNode;
  wrapper: FrameNode;
  instances: InstanceNode[];
  combos: VariantCombo[];
  instanceCount: number;
  auditRows: AuditRuleResult[];
  setPropertiesErrors: string[];
}

export interface PropApplyFailure {
  variantName: string;
  propName: string;
  message: string;
}

export interface VariantAxisValidation {
  ok: boolean;
  expected: string[];
  actual: string[];
}

export interface ApplyPropertiesResult {
  ok: boolean;
  propKeys: Record<string, string>;
  variantAxes: Record<string, VariantAxisValidation>;
  failures: PropApplyFailure[];
  implicitProps: string[];
  bindWarnings: string[];
}

/** WO-023 hook — caller supplies applyBindings until WO-023 merges into scaffold index. */
export type ApplyBindingsRunner = (
  spec: import('@detroitlabs/figmint-contracts').ComponentSpecV1,
  componentSet: ComponentSetNode,
) => void | Promise<void>;
