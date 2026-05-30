import type { ImportTemplate, ImportTemplateContext, ImportTemplateResult } from '@/core/import/types';

import { parseReactComponent } from './react/parseReactComponent';

export class ReactImportTemplate implements ImportTemplate {
  readonly framework = 'react' as const;

  parse(ctx: ImportTemplateContext): ImportTemplateResult {
    return parseReactComponent(ctx);
  }
}

export { parseReactComponent } from './react/parseReactComponent';
