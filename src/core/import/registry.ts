import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

import { ReactImportTemplate } from './templates/react';
import type { ImportTemplate } from './types';

const REACT_TEMPLATE = new ReactImportTemplate();

export function getImportTemplate(framework: ComponentFramework): ImportTemplate | null {
  if (framework === 'react') {
    console.debug('[import] getImportTemplate', framework);
    return REACT_TEMPLATE;
  }
  console.debug('[import] getImportTemplate', framework, 'null');
  return null;
}

export function listSupportedImportFrameworks(): ComponentFramework[] {
  return ['react'];
}
