import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

import { renderGfmTable, renderMetaBullets } from './shared';

export function renderHandoffContextMarkdown(doc: HandoffContextV1): string {
  const sections: string[] = ['# handoff-context v1', ''];

  sections.push('## Meta');
  sections.push(
    renderMetaBullets({
      capturedAt: doc.meta.capturedAt,
      figmaFileKey: doc.meta.figmaFileKey,
      frameUrl: doc.meta.frameUrl,
    }),
  );
  sections.push('');

  sections.push('## Frames');
  sections.push('');
  const frames = [...doc.frames].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  for (const frame of frames) {
    sections.push(`### ${frame.name} (\`${frame.nodeId}\`)`);
    sections.push(`- Deep link: ${frame.deepLink}`);
    sections.push(`![${frame.name}](${frame.screenshot.dataUrl})`);
    sections.push('');
  }

  sections.push('## Components used');
  sections.push('');
  const componentRows = doc.components.map((component) => [
    component.name,
    String(component.instances),
    component.codeConnectUrl ? `[link](${component.codeConnectUrl})` : '—',
  ]);
  sections.push(renderGfmTable(['Component', 'Instances', 'Code Connect'], componentRows));
  sections.push('');

  sections.push('## Tokens used');
  sections.push('');
  for (const token of doc.tokensUsed) {
    sections.push(`- ${token}`);
  }
  sections.push('');

  sections.push('## Auto layout');
  sections.push('');
  sections.push(
    renderGfmTable(
      ['Property', 'Value'],
      [
        ['direction', doc.autoLayout.direction],
        ['gap', doc.autoLayout.gap],
        ['padding', doc.autoLayout.padding ?? '—'],
      ],
    ),
  );
  sections.push('');

  return sections.join('\n').trimEnd() + '\n';
}
