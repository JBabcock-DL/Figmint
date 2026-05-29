/// <reference types="@figma/plugin-typings" />

/** Documentation collection variables used by doc pipeline emitters in tests. */
export const DOC_PIPELINE_CHROME_VARIABLES = [
  { id: 'var-table-surface', name: 'doc/table/surface' },
  { id: 'var-table-header', name: 'doc/table/header-surface' },
  { id: 'var-table-border', name: 'doc/table/border' },
  { id: 'var-text-primary', name: 'doc/text/primary' },
  { id: 'var-text-muted', name: 'doc/text/muted' },
] as const;

export const DOC_PIPELINE_TEXT_STYLES = [
  { id: 'style-section', name: '_Doc/Section', fontName: { family: 'Inter', style: 'Regular' } },
  { id: 'style-caption', name: '_Doc/Caption', fontName: { family: 'Inter', style: 'Regular' } },
  {
    id: 'style-token-name',
    name: '_Doc/TokenName',
    fontName: { family: 'Inter', style: 'Regular' },
  },
  { id: 'style-code', name: '_Doc/Code', fontName: { family: 'Inter', style: 'Regular' } },
] as const;

export function installDocPipelineVariableMocks(figmaApi: Record<string, unknown>): void {
  figmaApi.variables = Object.assign({}, figmaApi.variables as object, {
    getLocalVariablesAsync: async () => [...DOC_PIPELINE_CHROME_VARIABLES],
    setBoundVariableForPaint: (paint: SolidPaint, _field: string, _variable: Variable) => {
      return Object.assign({}, paint, { boundVariables: { color: { id: 'mock-var' } } });
    },
  });
}
