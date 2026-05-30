import { buildHandoffContext } from '@/core/handoff/build';
import { selectionSummary } from '@/core/handoff/selectionSummary';
import { assertHandoffContextV1 } from '@/core/handoff/validate';
import { pluginLog } from '@/core/pluginLog';
import {
  HANDOFF_CAPTURE_RESULT,
  HANDOFF_SELECTION,
  type HandoffCaptureMessage,
  type HandoffCaptureResultMessage,
  type HandoffSelectionMessage,
} from '@/io/messages/handoff';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

export { selectionSummary };

export async function handleHandoffCapture(message: HandoffCaptureMessage): Promise<void> {
  const start = Date.now();
  pluginLog('[main] handoff/capture start', message.requestId);

  try {
    const { document, markdown, warnings } = await buildHandoffContext();
    assertHandoffContextV1(document);

    const response: HandoffCaptureResultMessage = {
      type: HANDOFF_CAPTURE_RESULT,
      requestId: message.requestId,
      ok: true,
      markdown: markdown,
      document: document,
      warnings: warnings,
      durationMs: Date.now() - start,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] handoff/capture done', String(response.durationMs) + 'ms');
  } catch (error) {
    const response: HandoffCaptureResultMessage = {
      type: HANDOFF_CAPTURE_RESULT,
      requestId: message.requestId,
      ok: false,
      error: extractErrorMessage(error),
      durationMs: Date.now() - start,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] handoff/capture failed', response.error !== undefined ? response.error : '');
  }
}

export function broadcastHandoffSelection(): void {
  const summary = selectionSummary(figma.currentPage.selection);
  const message: HandoffSelectionMessage = {
    type: HANDOFF_SELECTION,
    count: summary.count,
    names: summary.names,
  };
  figma.ui.postMessage(message);
}
