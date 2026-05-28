import type { DriftReportV1, DriftEntry } from '@detroitlabs/fighub-contracts';

import { renderGfmTable, renderMetaBullets, truncateUnknown } from './shared';

function sortDriftsById(drifts: readonly DriftEntry[]): DriftEntry[] {
  return [...drifts].sort((a, b) => a.id.localeCompare(b.id));
}

function renderDriftTable(drifts: DriftEntry[]): string {
  const rows = sortDriftsById(drifts).map((entry) => [
    entry.id,
    entry.kind,
    truncateUnknown(entry.figma),
    truncateUnknown(entry.repo),
    truncateUnknown(entry.lastSynced),
  ]);
  return renderGfmTable(['ID', 'Kind', 'Figma', 'Repo', 'Last synced'], rows);
}

export function renderDriftReportMarkdown(doc: DriftReportV1): string {
  const sections: string[] = ['# drift-report v1', ''];

  sections.push('## Meta');
  sections.push(
    renderMetaBullets({
      generatedAt: doc.meta.generatedAt,
      figmaFileKey: doc.meta.figmaFileKey,
      repoUrl: doc.meta.repoUrl,
    }),
  );
  sections.push('');

  sections.push('## Summary');
  sections.push(
    renderGfmTable(
      ['Direction', 'Count'],
      [
        ['↑ Push', String(doc.summary.push)],
        ['↓ Pull', String(doc.summary.pull)],
        ['⚠ Conflicts', String(doc.summary.conflict)],
        ['Synced', String(doc.summary.synced)],
      ],
    ),
  );
  sections.push('');

  const pushDrifts = doc.drifts.filter((entry) => entry.direction === 'push');
  const pullDrifts = doc.drifts.filter((entry) => entry.direction === 'pull');
  const conflictDrifts = doc.drifts.filter((entry) => entry.direction === 'conflict');

  if (doc.summary.push > 0) {
    sections.push(`## ↑ Push (${doc.summary.push})`);
    sections.push(renderDriftTable(pushDrifts));
    sections.push('');
  }

  if (doc.summary.pull > 0) {
    sections.push(`## ↓ Pull (${doc.summary.pull})`);
    sections.push(renderDriftTable(pullDrifts));
    sections.push('');
  }

  if (doc.summary.conflict > 0) {
    sections.push(`## ⚠ Conflicts (${doc.summary.conflict})`);
    sections.push(renderDriftTable(conflictDrifts));
    sections.push('');
  }

  return sections.join('\n').trimEnd() + '\n';
}
