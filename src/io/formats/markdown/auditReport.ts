import type { AuditReportV1 } from '@detroitlabs/fighub-contracts';

import { renderGfmTable, renderMetaBullets } from './shared';

export function renderAuditReportMarkdown(doc: AuditReportV1): string {
  const sections: string[] = ['# audit-report v1', ''];

  sections.push('## Meta');
  sections.push(
    renderMetaBullets({
      generatedAt: doc.meta.generatedAt,
      scope: doc.meta.scope,
      operation: doc.meta.operation,
      figmaFileKey: doc.meta.figmaFileKey,
    }),
  );
  sections.push('');

  sections.push('## Summary');
  sections.push('');
  sections.push(`**Passed:** ${doc.passed ? 'yes' : 'no'}`);
  sections.push('');
  sections.push(
    renderGfmTable(
      ['Status', 'Count'],
      [
        ['Passed', String(doc.summary.rulesPassed)],
        ['Failed', String(doc.summary.rulesFailed)],
        ['Warned', String(doc.summary.rulesWarned)],
      ],
    ),
  );
  sections.push('');

  const failedRules = doc.results.filter((result) => !result.pass);
  if (failedRules.length > 0) {
    sections.push('## Failed rules');
    sections.push('');
    const rows = [...failedRules]
      .sort((a, b) => a.ruleId.localeCompare(b.ruleId))
      .map((result) => [result.ruleId, result.severity ?? 'error', result.diagnostic]);
    sections.push(renderGfmTable(['ruleId', 'severity', 'message'], rows));
    sections.push('');
  }

  return sections.join('\n').trimEnd() + '\n';
}
