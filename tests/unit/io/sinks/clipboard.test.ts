import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clipboardSink } from '@/io/sinks/clipboard';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';

describe('clipboardSink', () => {
  let execCommand: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    execCommand = vi.fn().mockReturnValue(true);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    document.execCommand = execCommand as typeof document.execCommand;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies via writeText when available', async () => {
    const doc = loadDriftSampleDoc();
    const result = await clipboardSink.write(doc, { format: 'json' });

    expect(result.ok).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(result.artifacts![0].format).toBe('json');
  });

  it('falls back to execCommand when writeText rejects', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('blocked', 'NotAllowedError'),
    );
    execCommand.mockReturnValue(true);

    const doc = loadDriftSampleDoc();
    const result = await clipboardSink.write(doc, { format: 'md' });

    expect(result.ok).toBe(true);
    expect(result.message).toContain('fallback');
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns ok:false when both writeText and execCommand fail', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('blocked', 'NotAllowedError'),
    );
    execCommand.mockReturnValue(false);

    const doc = loadDriftSampleDoc();
    const result = await clipboardSink.write(doc, { format: 'md' });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('prefers markdown when format is both', async () => {
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const doc = loadDriftSampleDoc();
    const result = await clipboardSink.write(doc, { format: 'both' });

    expect(result.ok).toBe(true);
    expect(result.artifacts![0].format).toBe('md');
    const copied = writeSpy.mock.calls[0][0];
    expect(copied).toContain('## ↑ Push');
  });

  it('respects primaryFormat override when format is both', async () => {
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const doc = loadDriftSampleDoc();
    const result = await clipboardSink.write(doc, { format: 'both', primaryFormat: 'json' });

    expect(result.ok).toBe(true);
    expect(result.artifacts![0].format).toBe('json');
    const copied = writeSpy.mock.calls[0][0];
    expect(copied).toContain('"kind": "drift-report"');
  });
});
