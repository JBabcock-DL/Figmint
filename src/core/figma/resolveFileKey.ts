export const FIGMA_FILE_KEY_PLUGIN_DATA = 'fighub.figmaFileKey';

export type FigmaFileKeySource = 'api' | 'override' | 'none';

export interface ResolvedFigmaFileKey {
  fileKey: string;
  source: FigmaFileKeySource;
}

const FILE_KEY_FROM_URL = /figma\.com\/design\/([a-zA-Z0-9]+)/;
const BARE_FILE_KEY = /^[a-zA-Z0-9]{10,}$/;

export function parseFigmaFileKeyInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const urlMatch = FILE_KEY_FROM_URL.exec(trimmed);
  if (urlMatch !== null && urlMatch[1] !== undefined) {
    return urlMatch[1];
  }

  if (BARE_FILE_KEY.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function readManualFigmaFileKeyOverride(): string {
  if (typeof figma === 'undefined') {
    return '';
  }
  const stored = figma.root.getPluginData(FIGMA_FILE_KEY_PLUGIN_DATA);
  return typeof stored === 'string' && stored.length > 0 ? stored : '';
}

export function writeManualFigmaFileKeyOverride(fileKey: string): void {
  figma.root.setPluginData(FIGMA_FILE_KEY_PLUGIN_DATA, fileKey);
}

export function clearManualFigmaFileKeyOverride(): void {
  figma.root.setPluginData(FIGMA_FILE_KEY_PLUGIN_DATA, '');
}

export function resolveFigmaFileKey(): ResolvedFigmaFileKey {
  if (typeof figma !== 'undefined') {
    const nativeKey = figma.fileKey;
    if (typeof nativeKey === 'string' && nativeKey.length > 0) {
      return { fileKey: nativeKey, source: 'api' };
    }
  }

  const override = readManualFigmaFileKeyOverride();
  if (override.length > 0) {
    return { fileKey: override, source: 'override' };
  }

  return { fileKey: '', source: 'none' };
}

export function fileKeyResolutionWarning(resolved: ResolvedFigmaFileKey): string | null {
  if (resolved.fileKey.length > 0) {
    return null;
  }

  if (typeof figma !== 'undefined' && figma.fileKey === undefined) {
    return (
      'Deep links need a file key — set one in Settings (Community builds) or enable the private plugin API (dev/org builds).'
    );
  }

  if (typeof figma !== 'undefined' && figma.fileKey === '') {
    return 'Deep links unavailable — save this file to Figma cloud, or set a file key in Settings.';
  }

  return 'Deep links unavailable — set a file key in Settings.';
}
