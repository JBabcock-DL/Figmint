import { beforeEach, describe, expect, it } from 'vitest';

import {
  DOC_CHROME_PATHS,
  DOC_CHROME_TOKENS,
  DOCUMENTATION_COLLECTION_NAME,
  publishDocumentationChrome,
} from '@/core/variables/documentationChrome';
import { installMockFigmaVariables, mockStores } from './__mocks__/figmaVariables';

describe('documentationChrome', () => {
  beforeEach(() => {
    installMockFigmaVariables();
  });

  it('defines six scoped tokens for style-guide table chrome', () => {
    expect(DOC_CHROME_TOKENS.length).toBe(6);
    expect(DOC_CHROME_PATHS).toEqual(
      DOC_CHROME_TOKENS.map(function (token) {
        return token.name;
      }),
    );
    expect(
      DOC_CHROME_TOKENS.every(function (token) {
        return token.name.startsWith('doc/');
      }),
    ).toBe(true);
  });

  it('creates Documentation collection with Default mode on publish', async () => {
    const result = await publishDocumentationChrome();
    expect(result.created).toBe(6);
    expect(result.updated).toBe(0);

    const collection = mockStores.collections.find(function (entry) {
      return entry.name === DOCUMENTATION_COLLECTION_NAME;
    });
    expect(collection).toBeDefined();
    expect(collection?.modes[0].name).toBe('Default');
    expect(mockStores.variables.length).toBe(6);

    const primary = mockStores.variables.find(function (entry) {
      return entry.name === 'doc/text/primary';
    });
    expect(primary?.scopes).toEqual(['TEXT_FILL']);
  });

  it('updates existing documentation tokens on second publish', async () => {
    await publishDocumentationChrome();
    const second = await publishDocumentationChrome();
    expect(second.created).toBe(0);
    expect(second.updated).toBe(6);
  });
});
