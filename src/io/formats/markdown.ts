import type { FormattableDocument } from './index';
import { renderAuditReportMarkdown } from './markdown/auditReport';
import { renderComponentSpecMarkdown } from './markdown/componentSpec';
import { renderDriftReportMarkdown } from './markdown/driftReport';
import { renderHandoffContextMarkdown } from './markdown/handoffContext';
import { renderOpsProgramMarkdown } from './markdown/opsProgram';
import { renderTokensMarkdown } from './markdown/tokens';

export function serializeMarkdown(doc: FormattableDocument): string {
  switch (doc.kind) {
    case 'drift-report':
      return renderDriftReportMarkdown(doc);
    case 'handoff-context':
      return renderHandoffContextMarkdown(doc);
    case 'component-spec':
      return renderComponentSpecMarkdown(doc);
    case 'tokens':
      return renderTokensMarkdown(doc);
    case 'ops-program':
      return renderOpsProgramMarkdown(doc);
    case 'audit-report':
      return renderAuditReportMarkdown(doc);
    default:
      throw new Error(
        'Unsupported document kind: ' + String((doc as { kind?: string }).kind),
      );
  }
}
