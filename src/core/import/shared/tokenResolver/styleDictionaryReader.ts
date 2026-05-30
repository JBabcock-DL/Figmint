export interface StyleDictionaryReadResult {
  detected: boolean;
}

/** MVP stub — detection only; full parser deferred. */
export function readStyleDictionarySource(_text: string): StyleDictionaryReadResult {
  return { detected: false };
}
