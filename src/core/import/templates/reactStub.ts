import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { scanDependencies } from '../shared/dependencyScanner';
import { inferLayoutFromSource } from '../shared/layoutInferrer';
import { mapTsPropsToSpec } from '../shared/propTypeMapper';
import type { ImportTemplate, ImportTemplateContext, ImportTemplateResult } from '../types';

function deriveComponentName(sourcePath: string): string {
  const base = sourcePath.replace(/\\/g, '/').split('/').pop() || 'Component';
  const withoutExt = base.replace(/\.(tsx?|jsx?)$/, '');
  return withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1);
}

export class ReactImportTemplateStub implements ImportTemplate {
  readonly framework = 'react' as const;

  parse(ctx: ImportTemplateContext): ImportTemplateResult {
    const name = deriveComponentName(ctx.sourcePath);
    const props = mapTsPropsToSpec({ props: [] });
    const layout = inferLayoutFromSource({ sourceText: ctx.sourceText });
    const dependencyTree = scanDependencies(ctx.sourceText, ctx.sourcePath, {
      registryKeys: ctx.registryKeys,
    });

    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: name,
      framework: 'react',
      variantMatrix: {},
      props: props,
      bindings: [],
      layout: layout,
      confidence: { layout: 'low', bindings: 'low', unresolved: ['WO-039-stub'] },
    };

    return {
      spec: spec,
      dependencyTree: dependencyTree,
      issues: [
        { code: 'STUB', message: 'React import stub — replace in WO-041', severity: 'warning' },
      ],
    };
  }
}
