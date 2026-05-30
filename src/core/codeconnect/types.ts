import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

export interface UnmappedComponentRef {
  nodeId: string;
  name: string;
  componentKey: string;
  fileKey: string;
  /** Figma component property definitions for stub props block (research D3) */
  componentProperties: Record<string, { type: string; defaultValue?: string | boolean }>;
}

export interface MappingStubFile {
  relativePath: string;
  content: string;
}

export interface MappingTemplateContext {
  component: UnmappedComponentRef;
  repoComponentsRoot: string;
  /** e.g. './button' relative to stub file */
  implementationImportPath: string;
  /** Figma file slug for node URL — defaults to 'file' when omitted */
  figmaFileSlug?: string;
}

export interface MappingTemplate {
  readonly framework: ComponentFramework;
  generateStub(ctx: MappingTemplateContext): MappingStubFile;
}
