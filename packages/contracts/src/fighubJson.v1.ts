export interface FigHubJsonV1 {
  v: 1;
  kind: 'fighub-config';
  tokensPath?: string;
  specsPath?: string;
  designSystemBranch?: string;
  exportBasePath?: string;
}

export interface ResolvedFigHubConfig {
  tokensPath: string;
  specsPath: string;
  exportBasePath: string;
  designSystemBranch: string;
}
