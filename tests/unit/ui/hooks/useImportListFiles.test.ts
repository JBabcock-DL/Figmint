import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  resetImportListFilesStateForTests,
  useImportListFiles,
} from '@/ui/hooks/useImportListFiles';
import { resetImportMessageStateForTests } from '@/ui/import/importMessageListener';

describe('useImportListFiles', () => {
  it('loads files on result', function () {
    resetImportListFilesStateForTests();
    resetImportMessageStateForTests();

    const { result } = renderHook(function () {
      return useImportListFiles('https://github.com/acme/widgets');
    });

    act(function () {
      result.current.refresh('src/');
    });
    expect(result.current.state.loading).toBe(true);

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'import/list-files/result',
              requestId: 'import-list-1',
              ok: true,
              files: [{ path: 'src/a.tsx', name: 'a.tsx' }],
            },
          },
        }),
      );
    });

    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.files).toHaveLength(1);
  });

  it('sets error on failed result', function () {
    resetImportListFilesStateForTests();
    resetImportMessageStateForTests();

    const { result } = renderHook(function () {
      return useImportListFiles('https://github.com/acme/widgets');
    });

    act(function () {
      result.current.refresh();
    });

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'import/list-files/result',
              requestId: 'import-list-1',
              ok: false,
              files: [],
              error: 'timeout',
            },
          },
        }),
      );
    });

    expect(result.current.state.error).toBe('timeout');
  });
});
