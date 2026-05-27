export { detectContract } from './detect';
export { loadFromPaste } from './paste';
export { loadFromFile } from './file';
export { probeClipboard, loadFromPasteEvent } from './clipboard';
export type {
  ClipboardProbeResult,
  ClipboardSourceMeta,
  ContractKind,
  FileSourceMeta,
  LoadedDocument,
  PasteSourceMeta,
  SourceMeta,
  ValidationError,
  ValidationErrorKind,
  ValidationErrorLocation,
} from './types';
export { PASTE_MAX, RAW_SNIPPET_MAX } from './types';
