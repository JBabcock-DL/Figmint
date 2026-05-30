import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

import { ReactMappingTemplate } from './templates/react';
import type { MappingTemplate } from './types';

const REACT_TEMPLATE = new ReactMappingTemplate();

export function getMappingTemplate(framework: ComponentFramework): MappingTemplate | null {
  if (framework === 'react') {
    console.debug('[codeconnect] getMappingTemplate', framework);
    return REACT_TEMPLATE;
  }
  console.debug('[codeconnect] getMappingTemplate', framework, 'null');
  return null;
}

export function listSupportedMappingFrameworks(): ComponentFramework[] {
  return ['react'];
}
