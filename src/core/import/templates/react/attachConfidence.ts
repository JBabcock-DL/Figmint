import type { ComponentSpecConfidence, ComponentSpecConfidenceLevel } from '@detroitlabs/fighub-contracts';

export function attachConfidence(
  unresolvedTokens: string[],
  layoutConfidence: ComponentSpecConfidenceLevel,
): ComponentSpecConfidence {
  const confidence: ComponentSpecConfidence = {
    layout: layoutConfidence,
    bindings: unresolvedTokens.length > 0 ? 'low' : 'high',
  };
  if (unresolvedTokens.length > 0) {
    confidence.unresolved = unresolvedTokens.slice();
  }
  return confidence;
}
