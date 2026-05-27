import type { ComponentSpecV1 } from './componentSpec.v1';

export type OpsProgramGeneratedBy = 'claude' | 'designer' | 'cli' | 'figma-agent';

export interface OpsProgramMeta {
  generatedAt: string;
  generatedBy: OpsProgramGeneratedBy;
}

export interface InlineTokenSource {
  kind: 'inline';
  tokens: Record<string, unknown>;
}

export interface PushTokensOp {
  type: 'push-tokens';
  source: InlineTokenSource;
}

export interface BuildStyleGuideOp {
  type: 'build-style-guide';
  pages: ('color' | 'typography' | 'layout' | 'effects' | 'overview')[];
}

export interface ScaffoldComponentOp {
  type: 'scaffold-component';
  spec: ComponentSpecV1;
}

export interface ImportComponentOp {
  type: 'import-component';
  repoPath: string;
}

export interface DetectDriftOp {
  type: 'detect-drift';
  scope: ('variables' | 'components')[];
}

export interface ApplyResolutionDecision {
  id: string;
  action: 'push' | 'pull' | 'skip';
}

export interface ApplyResolutionOp {
  type: 'apply-resolution';
  decisions: ApplyResolutionDecision[];
}

export interface EmitHandoffOp {
  type: 'emit-handoff';
  selection: string[];
}

export type CodeConnectFramework = 'react' | 'vue' | 'wc' | 'swiftui' | 'compose';

export interface EmitCodeConnectPrOp {
  type: 'emit-code-connect-pr';
  components: string[];
  framework: CodeConnectFramework;
}

export type OpsProgramOp =
  | PushTokensOp
  | BuildStyleGuideOp
  | ScaffoldComponentOp
  | ImportComponentOp
  | DetectDriftOp
  | ApplyResolutionOp
  | EmitHandoffOp
  | EmitCodeConnectPrOp;

export interface OpsProgramV1 {
  v: 1;
  kind: 'ops-program';
  meta: OpsProgramMeta;
  ops: OpsProgramOp[];
}
