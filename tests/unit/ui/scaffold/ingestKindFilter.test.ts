import { describe, expect, it } from 'vitest';

import { classifyComponentsIngest } from '@/ui/components/scaffold/ingestDocument';
import type { LoadedDocument } from '@/io/sources/types';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

function doc(kind: LoadedDocument['kind'], payload: unknown): LoadedDocument {
  return {
    kind: kind,
    payload: payload,
    sourceMeta: { port: 'paste', receivedAt: '2026-01-01T00:00:00.000Z', charLength: 0 },
    rawSnippet: '',
  };
}

describe('components ingest kind filter', () => {
  it('accepts component-spec', () => {
    const outcome = classifyComponentsIngest(
      doc('component-spec', canonicalFixture),
    );
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.kind).toBe('component-spec');
    }
  });

  it('rejects tokens with actionable copy', () => {
    const outcome = classifyComponentsIngest(doc('tokens-dtcg', { color: {} }));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.message).toContain('Bootstrap tab');
    }
  });
});
