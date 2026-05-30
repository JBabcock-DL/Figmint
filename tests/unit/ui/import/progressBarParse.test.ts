import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { IMPORT_PARSE_EXEC } from '@/io/messages/import';
import { runImportParseExec } from '@/ui/import/runImportParseExec';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('runImportParseExec ProgressBar', () => {
  it('parses ProgressBar.tsx without throwing', () => {
    const sourceText = readFileSync(
      join(repoRoot, 'src/ui/components/ProgressBar.tsx'),
      'utf8',
    );
    const result = runImportParseExec({
      type: IMPORT_PARSE_EXEC,
      requestId: 'progress-bar',
      sourcePath: 'src/ui/components/ProgressBar.tsx',
      sourceText: sourceText,
      registryKeys: [],
      classToVariable: {},
    });
    if (!result.ok) {
      throw new Error(result.error !== undefined ? result.error : 'parse failed');
    }
    expect(result.spec?.name).toBe('ProgressBar');
  });
});
