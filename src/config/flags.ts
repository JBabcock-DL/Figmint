/** Single build — all Phase 1 capabilities enabled. Dual Community/Org gating deferred (WO-021 backlog). */
export const flags = {
  githubOAuth: true,
  githubPRSink: true,
  componentImport: true,
  codeConnectPR: true,
  evcProjector: true,
} as const;
