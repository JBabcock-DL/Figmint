import {
  clearManualFigmaFileKeyOverride,
  parseFigmaFileKeyInput,
  readManualFigmaFileKeyOverride,
  resolveFigmaFileKey,
  writeManualFigmaFileKeyOverride,
} from '@/core/figma/resolveFileKey';
import { pluginLog } from '@/core/pluginLog';
import {
  FIGMA_FILE_KEY_CHANGED,
  FIGMA_FILE_KEY_LOADED,
  type FigmaFileKeyChangedMessage,
  type FigmaFileKeyClearMessage,
  type FigmaFileKeyLoadMessage,
  type FigmaFileKeyLoadedMessage,
  type FigmaFileKeySaveMessage,
} from '@/io/messages/figmaFileKey';

function buildLoadedPayload(requestId: string): FigmaFileKeyLoadedMessage {
  const resolved = resolveFigmaFileKey();
  return {
    type: FIGMA_FILE_KEY_LOADED,
    requestId: requestId,
    ok: true,
    fileKey: resolved.fileKey,
    source: resolved.source,
    override: readManualFigmaFileKeyOverride(),
  };
}

function broadcastFigmaFileKeyChanged(): void {
  const resolved = resolveFigmaFileKey();
  const message: FigmaFileKeyChangedMessage = {
    type: FIGMA_FILE_KEY_CHANGED,
    fileKey: resolved.fileKey,
    source: resolved.source,
    override: readManualFigmaFileKeyOverride(),
  };
  figma.ui.postMessage(message);
}

export function handleFigmaFileKeyLoad(message: FigmaFileKeyLoadMessage): void {
  figma.ui.postMessage(buildLoadedPayload(message.requestId));
  pluginLog('[main] figma-file-key/load ok');
}

export function handleFigmaFileKeySave(message: FigmaFileKeySaveMessage): void {
  const parsed = parseFigmaFileKeyInput(message.input);
  if (parsed === null) {
    const response: FigmaFileKeyLoadedMessage = {
      type: FIGMA_FILE_KEY_LOADED,
      requestId: message.requestId,
      ok: false,
      error: 'Enter a Figma design URL or file key (at least 10 characters).',
    };
    figma.ui.postMessage(response);
    return;
  }

  writeManualFigmaFileKeyOverride(parsed);
  figma.ui.postMessage(buildLoadedPayload(message.requestId));
  broadcastFigmaFileKeyChanged();
  pluginLog('[main] figma-file-key/save ok', parsed);
}

export function handleFigmaFileKeyClear(message: FigmaFileKeyClearMessage): void {
  clearManualFigmaFileKeyOverride();
  figma.ui.postMessage(buildLoadedPayload(message.requestId));
  broadcastFigmaFileKeyChanged();
  pluginLog('[main] figma-file-key/clear ok');
}
