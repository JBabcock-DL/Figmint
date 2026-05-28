/// <reference types="@figma/plugin-typings" />

import type { DriftReportMeta } from '@detroitlabs/fighub-contracts';

export function buildDriftReportMeta(repoUrl: string): DriftReportMeta {
  let fileKey = '';
  if (figma.fileKey !== undefined && figma.fileKey.length > 0) {
    fileKey = figma.fileKey;
  }
  return {
    generatedAt: new Date().toISOString(),
    figmaFileKey: fileKey,
    repoUrl: repoUrl,
  };
}
