import type { FigmaFileKeySource } from '@/core/figma/resolveFileKey';

export function describeFigmaFileKeySource(source: FigmaFileKeySource): string {
  if (source === 'api') {
    return 'File key: from Figma';
  }
  if (source === 'override') {
    return 'File key: manual (Settings)';
  }
  return 'File key: not set — deep links disabled';
}
