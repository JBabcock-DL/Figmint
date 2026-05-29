import { describe, expect, it } from 'vitest';

import { buildDriftReportPrTitle, buildDriftResolutionPrBody } from '@/io/github/prBody';

describe('buildDriftReportPrTitle', () => {
  it('formats drift summary title', () => {
    expect(buildDriftReportPrTitle({ push: 4, pull: 2, conflict: 1, synced: 410 })).toBe(
      'FigHub updates: 4 push, 2 pull, 1 conflicts',
    );
  });

  it('includes change table in drift resolution PR body', () => {
    const body = buildDriftResolutionPrBody({
      commitMessage: 'FigHub: resolve design drift (push)',
      files: [{ path: 'design/tokens.json', format: 'json' }],
      pluginVersion: '0.0.0',
      figmaFileUrl: 'https://figma.com/file/x',
      figmaFileName: 'Demo',
      contractKind: 'drift-report',
      pushedCount: 2,
      changeTableMarkdown: '| `var/a` | variable | old | **new** |',
    });
    expect(body).toContain('Changes in this push (2)');
    expect(body).toContain('var/a');
  });
});
