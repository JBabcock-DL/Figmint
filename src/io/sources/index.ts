export { detectContract } from './detect';
export { loadFromPaste } from './paste';
export { loadFromFile } from './file';
export { probeClipboard, loadFromPasteEvent } from './clipboard';
export type {
  ClipboardProbeResult,
  ClipboardSourceMeta,
  ContractKind,
  FileSourceMeta,
  GitHubSourceMeta,
  LoadedDocument,
  PasteSourceMeta,
  SourceMeta,
  ValidationError,
  ValidationErrorKind,
  ValidationErrorLocation,
} from './types';
export { loadFromGitHub } from './github';
export { PASTE_MAX, RAW_SNIPPET_MAX } from './types';
