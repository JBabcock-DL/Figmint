import { describe, expect, it } from 'vitest';

import handoffFixture from '@/io/formats/__fixtures__/handoff-context-min.json';
import { defaultExportBasename } from '@/ui/export/defaultPaths';
import { prepareHandoffExport } from '@/ui/handoff/prepareHandoffExport';
import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

describe('prepareHandoffExport', () => {
  it('defaults to clipboard sink with markdown-only formats', function () {
    const prepared = prepareHandoffExport(handoffFixture as HandoffContextV1);

    expect(prepared.defaultSinks).toEqual(['clipboard']);
    expect(prepared.defaultFormats).toEqual({ json: false, md: true });
    expect(prepared.doc.kind).toBe('handoff-context');
    expect(prepared.doc.payload).toBe(handoffFixture);
  });

  it('uses handoff export basename pattern', function () {
    const prepared = prepareHandoffExport(handoffFixture as HandoffContextV1);
    expect(defaultExportBasename(prepared.doc, new Date('2026-05-27T12:00:00.000Z'))).toBe(
      'docs/fighub/handoff-2026-05-27',
    );
  });
});
