import { describe, expect, it } from 'vitest';

import {
  CATALOG_DISCOVER,
  CATALOG_SCAFFOLD_BATCH,
  CATALOG_SCAFFOLD_BATCH_PROGRESS,
  CATALOG_SCAFFOLD_BATCH_RESULT,
  isCatalogDiscoverMessage,
  isCatalogScaffoldBatchMessage,
  isCatalogScaffoldBatchProgressMessage,
  isCatalogScaffoldBatchResultMessage,
} from '@/io/messages/catalog';

describe('catalog message contract', () => {
  it('matches UI discover post shape', function () {
    const payload = {
      type: CATALOG_DISCOVER,
      requestId: 'catalog-discover-1',
      repoUrl: 'https://github.com/acme/widgets',
      specsPath: 'components/',
      designSystemBranch: 'main',
      forceRefresh: false,
    };
    expect(isCatalogDiscoverMessage(payload)).toBe(true);
  });

  it('matches UI batch post shape', function () {
    const payload = {
      type: CATALOG_SCAFFOLD_BATCH,
      requestId: 'catalog-batch-1',
      repoUrl: 'https://github.com/acme/widgets',
      specPaths: ['design/components/button.component-spec.v1.json'],
      options: { continueOnError: true },
    };
    expect(isCatalogScaffoldBatchMessage(payload)).toBe(true);
  });

  it('matches progress and result fields consumed by hooks', function () {
    expect(
      isCatalogScaffoldBatchProgressMessage({
        type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
        requestId: 'catalog-batch-1',
        index: 1,
        total: 3,
        specPath: 'design/components/input.component-spec.v1.json',
        status: 'done',
        displayName: 'Input',
      }),
    ).toBe(true);

    expect(
      isCatalogScaffoldBatchResultMessage({
        type: CATALOG_SCAFFOLD_BATCH_RESULT,
        requestId: 'catalog-batch-1',
        ok: false,
        completed: 2,
        failed: 1,
        registry: { v: 1, kind: 'registry', fileKey: 'fk', components: {} },
        errors: [{ specPath: 'bad.json', message: 'fail' }],
      }),
    ).toBe(true);
  });
});
