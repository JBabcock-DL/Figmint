export interface TokensStudioReadResult {
  detected: boolean;
}

/** MVP stub — requires explicit tokens.studio marker in JSON. */
export function readTokensStudioSource(text: string): TokensStudioReadResult {
  if (text.includes('"tokens.studio"') || text.includes("'tokens.studio'")) {
    return { detected: false };
  }
  return { detected: false };
}
