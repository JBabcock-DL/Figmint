import type { ContractDocument } from './types';

function formatLocalDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function kebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function defaultExportBasename(doc: ContractDocument, now: Date = new Date()): string {
  const date = formatLocalDate(now);

  switch (doc.kind) {
    case 'drift-report':
      return 'docs/fighub/drift-' + date;
    case 'handoff-context':
      return 'docs/fighub/handoff-' + date;
    case 'ops-program':
      return 'docs/fighub/ops-' + date;
    case 'component-spec':
      return 'docs/fighub/components/' + kebabCase(doc.payload.name);
    case 'registry':
      return 'docs/fighub/registry-export';
    case 'tokens':
      return 'docs/fighub/tokens-' + date;
    default: {
      const _exhaustive: never = doc;
      return _exhaustive;
    }
  }
}
