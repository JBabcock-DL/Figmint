import type { DriftEntry, DriftReportV1 } from '@detroitlabs/fighub-contracts';

const MAX_PR_ROWS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstModeValue(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return undefined;
  }
  if (isRecord(payload.valuesByMode)) {
    const modes = payload.valuesByMode;
    const keys = Object.keys(modes);
    if (keys.length > 0) {
      return modes[keys[0]];
    }
  }
  if (isRecord(payload.comparable) && isRecord(payload.comparable.valuesByMode)) {
    const keys = Object.keys(payload.comparable.valuesByMode);
    if (keys.length > 0) {
      return payload.comparable.valuesByMode[keys[0]];
    }
  }
  return undefined;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '—';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.length > 48 ? value.slice(0, 45) + '…' : value;
  }
  if (isRecord(value) && typeof value.r === 'number') {
    const r = Math.round(value.r * 255);
    const g = Math.round((value.g as number) * 255);
    const b = Math.round((value.b as number) * 255);
    const hex = function (n: number) {
      return n.toString(16).padStart(2, '0');
    };
    return '#' + hex(r) + hex(g) + hex(b);
  }
  const json = JSON.stringify(value);
  return json.length > 48 ? json.slice(0, 45) + '…' : json;
}

function findDrift(report: DriftReportV1, driftId: string): DriftEntry | null {
  for (let i = 0; i < report.drifts.length; i++) {
    if (report.drifts[i].id === driftId) {
      return report.drifts[i];
    }
  }
  return null;
}

export interface DriftChangeRow {
  id: string;
  kind: string;
  repoValue: string;
  figmaValue: string;
}

export function driftChangeRows(report: DriftReportV1, driftIds: string[]): DriftChangeRow[] {
  const rows: DriftChangeRow[] = [];
  for (let i = 0; i < driftIds.length; i++) {
    const drift = findDrift(report, driftIds[i]);
    if (drift === null) {
      continue;
    }
    rows.push({
      id: drift.id,
      kind: drift.kind,
      repoValue: formatValue(firstModeValue(drift.repo)),
      figmaValue: formatValue(firstModeValue(drift.figma)),
    });
  }
  return rows;
}

export function renderDriftChangeTableMarkdown(report: DriftReportV1, driftIds: string[]): string {
  const rows = driftChangeRows(report, driftIds);
  if (rows.length === 0) {
    return '_No per-item changes listed._';
  }

  const lines: string[] = [
    '| Token / item | Kind | Repo (before) | Figma (after) |',
    '| --- | --- | --- | --- |',
  ];

  const shown = rows.length > MAX_PR_ROWS ? rows.slice(0, MAX_PR_ROWS) : rows;
  for (let i = 0; i < shown.length; i++) {
    const row = shown[i];
    lines.push(
      '| `' +
        row.id +
        '` | ' +
        row.kind +
        ' | ' +
        row.repoValue +
        ' | **' +
        row.figmaValue +
        '** |',
    );
  }

  if (rows.length > MAX_PR_ROWS) {
    lines.push('', '_…and ' + String(rows.length - MAX_PR_ROWS) + ' more changes (see file diff)._');
  }

  return lines.join('\n');
}
