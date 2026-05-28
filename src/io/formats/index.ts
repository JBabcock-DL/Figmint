import type {
  AuditReportV1,
  ComponentSpecV1,
  DriftReportV1,
  HandoffContextV1,
  OpsProgramV1,
  TokensV1,
} from '@detroitlabs/fighub-contracts';

import { serializeJson } from './json';
import { serializeMarkdown } from './markdown';
import { stableStringify } from './stableStringify';

export type OutputFormat = 'json' | 'md';

export type FormattableDocument =
  | OpsProgramV1
  | TokensV1
  | ComponentSpecV1
  | DriftReportV1
  | HandoffContextV1
  | AuditReportV1;

const FORMATTABLE_KINDS = new Set<string>([
  'ops-program',
  'tokens',
  'component-spec',
  'drift-report',
  'handoff-context',
  'audit-report',
]);

export function assertFormattableKind(value: unknown): asserts value is FormattableDocument {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('kind' in value) ||
    typeof (value as { kind: unknown }).kind !== 'string' ||
    !FORMATTABLE_KINDS.has((value as { kind: string }).kind)
  ) {
    const kind =
      typeof value === 'object' && value !== null && 'kind' in value
        ? String((value as { kind: unknown }).kind)
        : 'unknown';
    throw new Error('Unsupported document kind: ' + kind);
  }
}

export function format(doc: FormattableDocument, fmt: OutputFormat): string {
  if (fmt === 'json') {
    return serializeJson(doc);
  }
  return serializeMarkdown(doc);
}

export { serializeJson, stableStringify };
