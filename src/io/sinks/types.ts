import type { ContractKind, LoadedDocument } from '@/io/sources/types';

export type OutputFormat = 'json' | 'md';
export type SinkId = 'download' | 'clipboard' | 'output-page' | 'plugin-data' | 'github-pr';

export type SinkFailureCode =
  | 'auth-required'
  | 'auth-expired'
  | 'branch-exists'
  | 'conflict'
  | 'forbidden'
  | 'not-found'
  | 'network'
  | 'unavailable';

export interface GithubPRSinkOptions {
  owner: string;
  repo: string;
  baseBranch: string;
  commitMessage: string;
  branchPattern?: string;
  headBranch?: string;
  prTitle?: string;
}

export interface GithubPRSinkContext {
  files: { path: string; content: string }[];
  contractKind: string;
  repoUrl: string;
  options: GithubPRSinkOptions;
  figmaFileKey: string;
  figmaFileName: string;
  prBodyOverride?: string;
}

export interface FormatOptions {
  format: OutputFormat | 'both';
  primaryFormat?: OutputFormat;
  baseName?: string;
  label?: string;
}

export interface SinkArtifact {
  format: OutputFormat;
  byteLength: number;
  destination?: string;
}

export interface SinkResult {
  ok: boolean;
  sink: SinkId;
  message: string;
  artifacts?: SinkArtifact[];
  error?: string;
  code?: SinkFailureCode;
}

export interface Sink {
  readonly id: SinkId;
  write(doc: LoadedDocument, options: FormatOptions): Promise<SinkResult>;
}

export interface SerializableDocument {
  kind: ContractKind;
  payload: unknown;
}
