import type { SinkId } from '@/io/sinks/types';

import { availableSinks } from './availableSinks';
import { defaultExportBasename } from './defaultPaths';
import type {
  ContractDocument,
  ExportFormatSelection,
  ExportResults,
  ExportSinkSelection,
} from './types';

export type ExportSheetState = {
  formats: ExportFormatSelection;
  sinks: ExportSinkSelection;
  path: string;
  exporting: boolean;
  results: ExportResults | null;
  formError: string | null;
};

export type ExportSheetAction =
  | { type: 'toggle-format'; format: 'json' | 'md' }
  | { type: 'toggle-sink'; sink: SinkId }
  | { type: 'set-path'; path: string }
  | { type: 'start-export'; requestId: string }
  | { type: 'sink-result'; sink: SinkId; ok: boolean; message?: string; error?: string }
  | { type: 'complete' }
  | { type: 'reset' };

export interface CreateInitialExportSheetStateOptions {
  defaultSinks?: SinkId[];
}

function initialFormats(kind: ContractDocument['kind']): ExportFormatSelection {
  if (kind === 'registry') {
    return { json: true, md: false };
  }
  return { json: true, md: true };
}

function buildInitialSinks(
  available: SinkId[],
  defaultSinks: SinkId[] | undefined,
): ExportSinkSelection {
  const allowed = new Set(available);
  const selected = new Set(
    (defaultSinks ?? []).filter(function (sink) {
      return allowed.has(sink);
    }),
  );
  const sinks = {} as ExportSinkSelection;
  for (let i = 0; i < available.length; i++) {
    const sink = available[i];
    sinks[sink] = selected.has(sink);
  }
  return sinks;
}

export function createInitialExportSheetState(
  document: ContractDocument,
  options?: CreateInitialExportSheetStateOptions,
): ExportSheetState {
  const sinksAvailable = availableSinks();
  return {
    formats: initialFormats(document.kind),
    sinks: buildInitialSinks(sinksAvailable, options?.defaultSinks),
    path: defaultExportBasename(document),
    exporting: false,
    results: null,
    formError: null,
  };
}

function mergeSinkResult(
  results: ExportResults,
  action: Extract<ExportSheetAction, { type: 'sink-result' }>,
): ExportResults {
  const bySink = Object.assign({}, results.bySink);
  bySink[action.sink] = {
    ok: action.ok,
    message: action.message,
    error: action.error,
  };
  return Object.assign({}, results, { bySink: bySink });
}

export function reduceExportSheet(
  state: ExportSheetState,
  action: ExportSheetAction,
  init?: { document: ContractDocument; defaultSinks?: SinkId[] },
): ExportSheetState {
  if (action.type === 'reset') {
    if (init !== undefined) {
      return createInitialExportSheetState(init.document, {
        defaultSinks: init.defaultSinks,
      });
    }
    return Object.assign({}, state, {
      exporting: false,
      results: null,
      formError: null,
    });
  }

  if (action.type === 'toggle-format') {
    const key = action.format;
    return Object.assign({}, state, {
      formats: Object.assign({}, state.formats, {
        [key]: !state.formats[key],
      }),
    });
  }

  if (action.type === 'toggle-sink') {
    const current = state.sinks[action.sink] === true;
    return Object.assign({}, state, {
      sinks: Object.assign({}, state.sinks, {
        [action.sink]: !current,
      }),
    });
  }

  if (action.type === 'set-path') {
    return Object.assign({}, state, { path: action.path });
  }

  if (action.type === 'start-export') {
    return Object.assign({}, state, {
      exporting: true,
      results: { requestId: action.requestId, bySink: {} },
      formError: null,
    });
  }

  if (action.type === 'sink-result') {
    const results = state.results;
    if (results === null) {
      return state;
    }
    return Object.assign({}, state, {
      results: mergeSinkResult(results, action),
    });
  }

  if (action.type === 'complete') {
    return Object.assign({}, state, { exporting: false });
  }

  return state;
}
