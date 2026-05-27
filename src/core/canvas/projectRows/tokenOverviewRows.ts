import type { CodeSyntaxTriple } from '@/core/canvas/types';
import {
  loadPlatformMappingRows,
  type PlatformMappingRow,
} from '@/core/canvas/data/loadCanvasData';

export interface TokenOverviewPlatformRow {
  tokenPath: string;
  collection: PlatformMappingRow['collection'];
  defaultHex: string;
  codeSyntax: CodeSyntaxTriple;
  variablePresent: boolean;
  tokenCellSuffix: string;
}

export interface VariableCodeSyntaxSource {
  codeSyntax?: Partial<CodeSyntaxTriple> & { IOS?: string };
}

function readCodeSyntax(variable: VariableCodeSyntaxSource | null): CodeSyntaxTriple {
  if (variable === null) {
    return { WEB: '', ANDROID: '', iOS: '' };
  }
  const cs = variable.codeSyntax !== undefined ? variable.codeSyntax : {};
  return {
    WEB: cs.WEB !== undefined ? String(cs.WEB) : '',
    ANDROID: cs.ANDROID !== undefined ? String(cs.ANDROID) : '',
    iOS: cs.iOS !== undefined ? String(cs.iOS) : cs.IOS !== undefined ? String(cs.IOS) : '',
  };
}

/**
 * Map platform-mapping-rows.json to row DTOs, merging live variable codeSyntax when present.
 */
export function projectTokenOverviewRows(
  variableMap: Record<string, VariableCodeSyntaxSource | undefined>,
): TokenOverviewPlatformRow[] {
  const spec = loadPlatformMappingRows();
  const rows: TokenOverviewPlatformRow[] = [];

  for (let i = 0; i < spec.rows.length; i++) {
    const row = spec.rows[i];
    const live = variableMap[row.tokenPath];
    const variablePresent = live !== undefined;
    let codeSyntax: CodeSyntaxTriple;
    let tokenCellSuffix = '';

    if (variablePresent) {
      codeSyntax = readCodeSyntax(live);
      const hasAny = codeSyntax.WEB !== '' || codeSyntax.ANDROID !== '' || codeSyntax.iOS !== '';
      if (!hasAny) {
        codeSyntax = {
          WEB: row.defaultHex,
          ANDROID: row.defaultHex,
          iOS: row.defaultHex,
        };
      }
    } else {
      codeSyntax = {
        WEB: row.defaultHex,
        ANDROID: row.defaultHex,
        iOS: row.defaultHex,
      };
      tokenCellSuffix = ' · stale';
    }

    rows.push({
      tokenPath: row.tokenPath,
      collection: row.collection,
      defaultHex: row.defaultHex,
      codeSyntax: codeSyntax,
      variablePresent: variablePresent,
      tokenCellSuffix: tokenCellSuffix,
    });
  }

  return rows;
}
