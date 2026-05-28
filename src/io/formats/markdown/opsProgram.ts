import type { OpsProgramOp, OpsProgramV1 } from '@detroitlabs/fighub-contracts';

import { renderGfmTable, renderMetaBullets } from './shared';

function summarizeOp(op: OpsProgramOp): string {
  switch (op.type) {
    case 'push-tokens':
      return `inline (${Object.keys(op.source.tokens).length} top-level keys)`;
    case 'build-style-guide':
      return `pages: ${op.pages.join(', ')}`;
    case 'scaffold-component':
      return `spec: ${op.spec.name}`;
    case 'import-component':
      return op.repoPath;
    case 'detect-drift':
      return `scope: ${op.scope.join(', ')}`;
    case 'apply-resolution':
      return `${op.decisions.length} decisions`;
    case 'emit-handoff':
      return `${op.selection.length} node ids`;
    case 'emit-code-connect-pr':
      return `${op.components.length} components, ${op.framework}`;
    default: {
      const unknown = op as { type?: string };
      return unknown.type ?? 'unknown';
    }
  }
}

export function renderOpsProgramMarkdown(doc: OpsProgramV1): string {
  const sections: string[] = ['# ops-program v1', ''];

  sections.push('## Meta');
  sections.push(
    renderMetaBullets({
      generatedAt: doc.meta.generatedAt,
      generatedBy: doc.meta.generatedBy,
    }),
  );
  sections.push('');

  sections.push('## Ops');
  sections.push('');
  const rows = doc.ops.map((op, index) => [String(index + 1), op.type, summarizeOp(op)]);
  sections.push(renderGfmTable(['#', 'type', 'summary'], rows));
  sections.push('');

  return sections.join('\n').trimEnd() + '\n';
}
