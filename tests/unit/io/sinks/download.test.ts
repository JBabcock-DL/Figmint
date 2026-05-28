import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadSink } from '@/io/sinks/download';
import { prepareSinkContent } from '@/io/sinks/prepareContent';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';

describe('downloadSink', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:mock');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURL,
      revokeObjectURL: revokeObjectURL,
    });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      return undefined;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads json file with correct MIME and filename', async () => {
    const doc = loadDriftSampleDoc();
    const result = await downloadSink.write(doc, { format: 'json' });

    expect(result.ok).toBe(true);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts![0].format).toBe('json');
    expect(result.artifacts![0].destination).toBe('drift-report-2026-05-27.v1.json');
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe('application/json');
  });

  it('downloads markdown file with correct MIME and filename', async () => {
    const doc = loadDriftSampleDoc();
    const result = await downloadSink.write(doc, { format: 'md' });

    expect(result.ok).toBe(true);
    expect(result.artifacts![0].destination).toBe('drift-report-2026-05-27.v1.md');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe('text/markdown;charset=utf-8');
  });

  it('downloads both json and md sequentially', async () => {
    const doc = loadDriftSampleDoc();
    const result = await downloadSink.write(doc, { format: 'both' });

    expect(result.ok).toBe(true);
    expect(result.artifacts).toHaveLength(2);
    expect(result.artifacts![0].destination).toBe('drift-report-2026-05-27.v1.json');
    expect(result.artifacts![1].destination).toBe('drift-report-2026-05-27.v1.md');
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it('returns ok:false when Blob URL creation throws', async () => {
    createObjectURL.mockImplementation(function () {
      throw new Error('blob failed');
    });

    const doc = loadDriftSampleDoc();
    const result = await downloadSink.write(doc, { format: 'json' });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('blob failed');
  });

  it('markdown download contains drift push section from format()', async () => {
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'md' });
    expect(prepared.markdown).toContain('## ↑ Push');

    const result = await downloadSink.write(doc, { format: 'md' });

    expect(result.ok).toBe(true);
    expect(result.artifacts![0].destination).toBe('drift-report-2026-05-27.v1.md');
    expect(createObjectURL).toHaveBeenCalled();
  });
});
