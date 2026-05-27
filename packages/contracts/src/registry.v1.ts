export interface RegistryComponentEntry {
  nodeId: string;
  key: string;
  pageName: string;
  publishedAt: string;
  /** @minimum 1 */
  version: number;
  cvaHash?: string | null;
  /** Present on composites: maps composed child kebab-name → registry version captured at last composite draw — Axis B stale detection. */
  composedChildVersions?: Record<string, number | null>;
}

export interface RegistryV1 {
  v: 1;
  kind: 'registry';
  fileKey: string;
  components: Record<string, RegistryComponentEntry>;
}
