export type DetectedSourceKind =
  | 'tailwind-v3-config'
  | 'tailwind-v4-css'
  | 'style-dictionary'
  | 'tokens-studio'
  | 'dtcg-tokens'
  | 'none';

export interface DetectedSource {
  kind: DetectedSourceKind;
  path: string;
  configSha?: string;
}

export type ColorUtility = 'bg' | 'text' | 'border';

export type ColorSlot = 'default' | 'content' | 'subtle';

/** Class fragment after variant-prefix strip, e.g. `bg-primary`. */
export type ClassFragment = string;

export interface ResolverCachePayload {
  configSha: string;
  detectedKind: DetectedSourceKind;
  detectedPath: string;
  classToVariable: Record<string, string>;
  updatedAt: string;
}
