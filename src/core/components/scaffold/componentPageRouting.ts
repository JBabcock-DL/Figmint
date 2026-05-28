/**
 * Detroit Labs Foundations component page names (DesignOps `/new-project` + shadcn-props).
 * One component spec name maps to one `↳ …` page — not the flat `Components` page.
 */

/** PascalCase spec `name` → Foundations page title (includes `↳` prefix). */
export const COMPONENT_PAGE_BY_SPEC_NAME: Record<string, string> = {
  Button: '↳ Buttons',
  'Button Group': '↳ Button Group',
  Toggle: '↳ Toggle',
  'Toggle Group': '↳ Toggle Group',
  Checkbox: '↳ Checkbox',
  Switch: '↳ Switch',
  Input: '↳ Input',
  Card: '↳ Cards',
  Badge: '↳ Badge',
  Avatar: '↳ Avatar',
  Alert: '↳ Alert',
  Dialog: '↳ Dialogue',
  Drawer: '↳ Drawer',
  Popover: '↳ Popover',
  Tooltip: '↳ Tooltips',
};

/** `Button` → `button`, `Button Group` → `button-group` (doc layer paths). */
export function specNameToDocKey(specName: string): string {
  const trimmed = specName.trim();
  if (trimmed.length === 0) {
    return 'component';
  }
  const spaced = trimmed.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveComponentPageName(specName: string): string {
  const mapped = COMPONENT_PAGE_BY_SPEC_NAME[specName];
  if (mapped !== undefined) {
    return mapped;
  }
  if (specName.startsWith('↳')) {
    return specName;
  }
  if (specName.endsWith('s')) {
    return '↳ ' + specName;
  }
  return '↳ ' + specName + 's';
}

export function docComponentRootName(docKey: string): string {
  return 'doc/component/' + docKey;
}

export function docComponentSetGroupName(docKey: string): string {
  return docComponentRootName(docKey) + '/component-set-group';
}

export function docUsageSectionName(docKey: string): string {
  return docComponentRootName(docKey) + '/usage';
}

export function docHeaderSectionName(docKey: string): string {
  return docComponentRootName(docKey) + '/header';
}

export function docPropertiesTableGroupName(docKey: string): string {
  return 'doc/table-group/' + docKey + '/properties';
}

export function docMatrixGroupName(docKey: string): string {
  return docComponentRootName(docKey) + '/matrix-group';
}

/** Canonical five-section doc pipeline order under `doc/component/{key}`. */
export function docPipelineSectionNames(docKey: string): string[] {
  return [
    docHeaderSectionName(docKey),
    docPropertiesTableGroupName(docKey),
    docComponentSetGroupName(docKey),
    docMatrixGroupName(docKey),
    docUsageSectionName(docKey),
  ];
}
