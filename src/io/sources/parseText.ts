import { detectContract } from './detect';
import type {
  ContractKind,
  LoadedDocument,
  ValidationError,
  ValidationErrorLocation,
} from './types';
import { RAW_SNIPPET_MAX } from './types';

export function truncateSnippet(input: string): string {
  if (input.length <= RAW_SNIPPET_MAX) {
    return input;
  }
  return input.slice(0, RAW_SNIPPET_MAX);
}

export function jsonParsePosition(input: string, err: unknown): { line?: number; column?: number } {
  if (!(err instanceof SyntaxError)) {
    return {};
  }
  const match = /position (\d+)/.exec(err.message);
  if (!match) {
    return {};
  }
  const position = Number(match[1]);
  let line = 1;
  let column = 1;
  for (let index = 0; index < position && index < input.length; index++) {
    if (input[index] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

export function parseTextToDocument(
  input: string,
  location: ValidationErrorLocation,
  buildMeta: (kind: ContractKind, charLength: number) => LoadedDocument['sourceMeta'],
): LoadedDocument | ValidationError {
  if (input.length === 0) {
    return {
      kind: 'empty',
      message: 'Input is empty.',
      location,
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input);
  } catch (err) {
    const { line, column } = jsonParsePosition(input, err);
    const base: ValidationError = {
      kind: 'invalid-json',
      message: err instanceof Error ? err.message : 'Invalid JSON.',
      location,
    };
    if (location.source === 'paste') {
      return { ...base, location: { source: 'paste', line, column } };
    }
    if (location.source === 'file') {
      return {
        ...base,
        location: { source: 'file', fileName: location.fileName, line, column },
      };
    }
    return base;
  }

  const kind = detectContract(input);
  if (kind === null) {
    return {
      kind: 'unknown-contract',
      message: 'Could not detect a supported contract kind.',
      location,
    };
  }

  return {
    kind,
    payload,
    sourceMeta: buildMeta(kind, input.length),
    rawSnippet: truncateSnippet(input),
  };
}
