import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';
import {
  resetImportParseStateForTests,
  useImportParse,
} from '@/ui/hooks/useImportParse';
import { resetImportMessageStateForTests } from '@/ui/import/importMessageListener';

describe('useImportParse', () => {
  it('completes parse and resets', function () {
    resetImportParseStateForTests();
    resetImportMessageStateForTests();

    const { result } = renderHook(function () {
      return useImportParse();
    });

    act(function () {
      result.current.parse({
        repoUrl: 'https://github.com/acme/widgets',
        sourcePath: 'src/button.tsx',
      });
    });
    expect(result.current.state.parsing).toBe(true);

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'import/parse/result',
              requestId: 'import-parse-1',
              ok: true,
              spec: canonicalFixture,
              dependencyTree: { rootImportPath: 'src/button.tsx', nodes: [] },
            },
          },
        }),
      );
    });

    expect(result.current.state.parsing).toBe(false);
    expect(result.current.state.spec?.name).toBe('Button');

    act(function () {
      result.current.reset();
    });
    expect(result.current.state.spec).toBeNull();
  });
});
