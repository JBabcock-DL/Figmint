import { flags } from '@/config/flags';
import type { SinkId } from '@/io/sinks/types';

import type { ExportSheetState, ExportSinkSelection } from './types';

export function availableSinks(): SinkId[] {
  const base: SinkId[] = ['download', 'clipboard', 'output-page', 'plugin-data'];
  if (flags.githubOAuth && flags.githubPRSink) {
    base.push('github-pr');
  }
  return base;
}

export function isPathInputVisible(sinks: ExportSinkSelection): boolean {
  return sinks.download === true || sinks['github-pr'] === true;
}

export function canExport(state: ExportSheetState): boolean {
  const hasFormat = state.formats.json || state.formats.md;
  const hasSink = Object.keys(state.sinks).some(function (k) {
    return state.sinks[k as SinkId];
  });
  return hasFormat && hasSink && !state.exporting;
}
