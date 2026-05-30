/// <reference types="@figma/plugin-typings" />

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  handleFigmaFileKeyClear,
  handleFigmaFileKeyLoad,
  handleFigmaFileKeySave,
} from '@/main/figmaFileKeyHandlers';

import {
  installHandoffFigmaMock,
  restoreHandoffFigmaMock,
} from '../../mocks/handoffFigma';
import { createMockExportableNode } from '../../mocks/handoffFigma';

function attachUiMock(): ReturnType<typeof vi.fn> {
  const postMessage = vi.fn();
  const globalRecord = globalThis as Record<string, unknown>;
  const figmaRecord = globalRecord.figma as Record<string, unknown>;
  figmaRecord.ui = { postMessage: postMessage };
  return postMessage;
}

describe('figmaFileKeyHandlers', () => {
  afterEach(function () {
    restoreHandoffFigmaMock();
    vi.restoreAllMocks();
  });

  it('loads current file key state', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: 'nativeKey1234',
    });
    const postMessage = attachUiMock();

    handleFigmaFileKeyLoad({ type: 'figma-file-key/load', requestId: 'req-1' });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'figma-file-key/loaded',
        ok: true,
        fileKey: 'nativeKey1234',
        source: 'api',
      }),
    );
  });

  it('saves parsed override from URL', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: undefined,
    });
    const postMessage = attachUiMock();

    handleFigmaFileKeySave({
      type: 'figma-file-key/save',
      requestId: 'req-2',
      input: 'https://www.figma.com/design/manualKey1234/Sandbox',
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        fileKey: 'manualKey1234',
        source: 'override',
        override: 'manualKey1234',
      }),
    );
  });

  it('rejects invalid save input', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: undefined,
    });
    const postMessage = attachUiMock();

    handleFigmaFileKeySave({
      type: 'figma-file-key/save',
      requestId: 'req-3',
      input: 'bad',
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.stringContaining('file key'),
      }),
    );
  });

  it('clears override', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: undefined,
      manualFileKey: 'manualKey1234',
    });
    const postMessage = attachUiMock();

    handleFigmaFileKeyClear({ type: 'figma-file-key/clear', requestId: 'req-4' });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        source: 'none',
        override: '',
      }),
    );
  });
});
