export interface SnapshotEntryV1 {
  key: string;
  value: unknown;
  source: 'push' | 'pull';
  timestamp: string;
}

export interface SnapshotRegistryEntryV1 {
  nodeId: string;
  key: string;
  pageName: string;
  publishedAt: string;
  version: number;
  cvaHash?: string | null;
  composedChildVersions?: Record<string, number | null>;
}

export interface SnapshotV1 {
  v: 1;
  kind: 'snapshot';
  fileKey: string;
  updatedAt: string;
  keys: Record<string, SnapshotEntryV1>;
  registry: { components: Record<string, SnapshotRegistryEntryV1> };
}
