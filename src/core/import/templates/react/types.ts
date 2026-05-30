import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';

import type { ExportedComponentMatch } from './findExportedComponent';

export interface CvaVariantMap {
  axes: Record<string, string[]>;
  bindingName: string;
  defaults?: Record<string, string>;
}

export interface ReactParseInternal {
  match: ExportedComponentMatch;
  props: ComponentSpecProp[];
  variantMatrix: Record<string, string[]>;
  classTokens: string[];
}

export interface ClassTokenContext {
  tokens: string[];
  hasIconSlot: boolean;
}
