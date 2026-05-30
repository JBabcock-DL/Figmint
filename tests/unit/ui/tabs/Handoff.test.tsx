/**
 * UI state map:
 *
 * | UI state            | Source                 | Action        |
 * | ------------------- | ---------------------- | ------------- |
 * | selection.count     | handoff/selection      | passive       |
 * | capturing           | local hook             | capture()     |
 * | markdown            | handoff/capture-result | passive       |
 * | document            | capture-result         | ExportSheet   |
 * | Export formats/sinks| ExportSheet reducer    | user toggle   |
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import handoffFixture from '@/io/formats/__fixtures__/handoff-context-min.json';
import handoffMarkdown from '@/io/formats/__fixtures__/handoff-context-min.md?raw';
import {
  registerFigmaFileKeyMessageListener,
  resetFigmaFileKeyMessageStateForTests,
} from '@/ui/figma/figmaFileKeyMessageListener';
import {
  registerHandoffMessageListener,
  resetHandoffMessageStateForTests,
} from '@/ui/handoff/handoffMessageListener';
import { resetHandoffCaptureStateForTests } from '@/ui/handoff/useHandoffCapture';
import { Handoff } from '@/ui/tabs/Handoff';
import * as runExportModule from '@/ui/export/runExport';
import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

function dispatchSelection(count: number, names: string[]): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: {
        pluginMessage: {
          type: 'handoff/selection',
          count: count,
          names: names,
        },
      },
    }),
  );
}

function dispatchCaptureResult(
  requestId: string,
  payload: {
    ok: boolean;
    markdown?: string;
    document?: HandoffContextV1;
    warnings?: string[];
    error?: string;
  },
): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: {
        pluginMessage: {
          type: 'handoff/capture-result',
          requestId: requestId,
          ...payload,
        },
      },
    }),
  );
}

function findHandoffCaptureRequestId(postMessage: ReturnType<typeof vi.fn>): string {
  for (let i = 0; i < postMessage.mock.calls.length; i++) {
    const payload = postMessage.mock.calls[i][0] as {
      pluginMessage?: { type?: string; requestId?: string };
    };
    if (payload.pluginMessage?.type === 'handoff/capture') {
      return payload.pluginMessage.requestId ?? '';
    }
  }
  throw new Error('handoff/capture request not found');
}

describe('Handoff tab', () => {
  afterEach(function () {
    resetHandoffMessageStateForTests();
    resetFigmaFileKeyMessageStateForTests();
    resetHandoffCaptureStateForTests();
    vi.restoreAllMocks();
  });

  it('disables capture and shows hint when nothing is selected', function () {
    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    const captureButton = screen.getByRole('button', { name: 'Capture selection' });
    expect(captureButton).toBeDisabled();
    expect(captureButton).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Select one or more frames in the canvas.')).toBeInTheDocument();
    expect(screen.getByLabelText('Handoff preview')).toHaveTextContent(
      'Capture a selection to preview handoff markdown.',
    );
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });

  it('enables capture and shows selected frame names', async function () {
    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    act(function () {
      dispatchSelection(2, ['Checkout', 'Details']);
    });

    await waitFor(function () {
      expect(screen.getByText('2 frame(s) selected — Checkout, Details')).toBeInTheDocument();
    });

    const captureButton = screen.getByRole('button', { name: 'Capture selection' });
    expect(captureButton).not.toBeDisabled();
    expect(captureButton).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('shows markdown preview and ExportSheet after successful capture', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    act(function () {
      dispatchSelection(1, ['Login Screen']);
    });

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Capture selection' })).not.toBeDisabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Capture selection' }));

    const requestId = findHandoffCaptureRequestId(postMessage);

    act(function () {
      dispatchCaptureResult(requestId, {
        ok: true,
        markdown: handoffMarkdown,
        document: handoffFixture as HandoffContextV1,
      });
    });

    await waitFor(function () {
      expect(screen.getByLabelText('Handoff preview')).toHaveTextContent('# handoff-context v1');
    });
    expect(screen.getByRole('region', { name: 'Export handoff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('shows error and hides ExportSheet when capture fails', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    act(function () {
      dispatchSelection(1, ['Login Screen']);
    });

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Capture selection' })).not.toBeDisabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Capture selection' }));

    const requestId = findHandoffCaptureRequestId(postMessage);

    act(function () {
      dispatchCaptureResult(requestId, {
        ok: false,
        error: 'Capture failed in main thread',
      });
    });

    await waitFor(function () {
      expect(screen.getByRole('alert')).toHaveTextContent('Capture failed in main thread');
    });
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });

  it('shows busy state while capturing and hides ExportSheet', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    act(function () {
      dispatchSelection(1, ['Login Screen']);
    });

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Capture selection' })).not.toBeDisabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Capture selection' }));

    expect(screen.getByRole('button', { name: 'Capturing…' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });

  it('invokes clipboard export with handoff markdown after capture', async function () {
    const user = userEvent.setup();
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    const runExport = vi.spyOn(runExportModule, 'runExport').mockImplementation(
      async function (_doc, _state, dispatch) {
        dispatch({ type: 'start-export', requestId: 'export-test' });
        dispatch({
          type: 'sink-result',
          sink: 'clipboard',
          ok: true,
          message: 'Copied handoff markdown',
        });
        dispatch({ type: 'complete' });
      },
    );

    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    act(function () {
      dispatchSelection(1, ['Login Screen']);
    });

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Capture selection' })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: 'Capture selection' }));

    const requestId = findHandoffCaptureRequestId(postMessage);

    act(function () {
      dispatchCaptureResult(requestId, {
        ok: true,
        markdown: handoffMarkdown,
        document: handoffFixture as HandoffContextV1,
      });
    });

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(runExport).toHaveBeenCalled();
    const exportedDoc = runExport.mock.calls[0][0];
    expect(exportedDoc.kind).toBe('handoff-context');
    expect(screen.getByRole('region', { name: 'Export handoff' })).toHaveTextContent(
      'Copied handoff markdown',
    );
  });

  it('shows file key status when none is configured', function () {
    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    expect(screen.getByText(/File key: not set/)).toBeInTheDocument();
    expect(screen.getByText(/Set a file key in Settings/)).toBeInTheDocument();
  });

  it('exposes preview aria-label and capture-before-export tab order', async function () {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    registerHandoffMessageListener();
    registerFigmaFileKeyMessageListener();
    render(<Handoff />);

    expect(screen.getByLabelText('Handoff preview')).toBeInTheDocument();

    act(function () {
      dispatchSelection(1, ['Login Screen']);
    });

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Capture selection' })).not.toBeDisabled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Capture selection' }));

    const requestId = findHandoffCaptureRequestId(postMessage);

    act(function () {
      dispatchCaptureResult(requestId, {
        ok: true,
        markdown: handoffMarkdown,
        document: handoffFixture as HandoffContextV1,
      });
    });

    await waitFor(function () {
      expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    });

    const tabOrder = Array.from(document.querySelectorAll('button')).map(function (button) {
      return button.textContent;
    });
    expect(tabOrder.indexOf('Capture selection')).toBeLessThan(tabOrder.indexOf('Export'));
  });
});
