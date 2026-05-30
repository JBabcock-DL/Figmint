import { describe, expect, it } from 'vitest';

import {
  CATALOG_DISCOVER,
  CATALOG_DISCOVER_RESULT,
  CATALOG_SCAFFOLD_BATCH,
  CATALOG_SCAFFOLD_BATCH_PROGRESS,
  CATALOG_SCAFFOLD_BATCH_RESULT,
  isCatalogDiscoverMessage,
  isCatalogDiscoverResultMessage,
  isCatalogScaffoldBatchMessage,
  isCatalogScaffoldBatchProgressMessage,
  isCatalogScaffoldBatchResultMessage,
  isCatalogUiMessage,
} from '@/io/messages/catalog';

describe('catalog messages', () => {
  it('accepts valid discover message', function () {
    expect(
      isCatalogDiscoverMessage({
        type: CATALOG_DISCOVER,
        requestId: 'req-1',
        repoUrl: 'https://github.com/acme/widgets',
        forceRefresh: true,
      }),
    ).toBe(true);
  });

  it('rejects discover message missing repoUrl', function () {
    expect(
      isCatalogDiscoverMessage({
        type: CATALOG_DISCOVER,
        requestId: 'req-1',
      }),
    ).toBe(false);
  });

  it('accepts valid scaffold batch message', function () {
    expect(
      isCatalogScaffoldBatchMessage({
        type: CATALOG_SCAFFOLD_BATCH,
        requestId: 'batch-1',
        repoUrl: 'https://github.com/acme/widgets',
        specPaths: ['design/components/button.component-spec.v1.json'],
      }),
    ).toBe(true);
  });

  it('accepts discover result and batch UI messages', function () {
    expect(
      isCatalogDiscoverResultMessage({
        type: CATALOG_DISCOVER_RESULT,
        requestId: 'req-1',
        ok: true,
        entries: [
          {
            key: 'button',
            path: 'design/components/button.component-spec.v1.json',
            displayName: 'button',
            kind: 'component-spec',
          },
        ],
      }),
    ).toBe(true);

    expect(
      isCatalogScaffoldBatchProgressMessage({
        type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
        requestId: 'batch-1',
        index: 0,
        total: 2,
        specPath: 'design/components/button.component-spec.v1.json',
        status: 'running',
      }),
    ).toBe(true);

    expect(
      isCatalogScaffoldBatchResultMessage({
        type: CATALOG_SCAFFOLD_BATCH_RESULT,
        requestId: 'batch-1',
        ok: true,
        completed: 2,
        failed: 0,
        registry: { v: 1, kind: 'registry', fileKey: 'fk', components: {} },
      }),
    ).toBe(true);

    expect(
      isCatalogUiMessage({
        type: CATALOG_SCAFFOLD_BATCH_RESULT,
        requestId: 'batch-1',
        ok: true,
        completed: 1,
        failed: 0,
        registry: { v: 1, kind: 'registry', fileKey: 'fk', components: {} },
      }),
    ).toBe(true);
  });

  it('rejects malformed batch progress status', function () {
    expect(
      isCatalogScaffoldBatchProgressMessage({
        type: CATALOG_SCAFFOLD_BATCH_PROGRESS,
        requestId: 'batch-1',
        index: 0,
        total: 1,
        specPath: 'x.json',
        status: 'pending',
      }),
    ).toBe(false);
  });
});
