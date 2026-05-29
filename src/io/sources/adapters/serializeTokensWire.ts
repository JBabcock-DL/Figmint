import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { serializeDTCG } from '@/io/sources/adapters/serializeDtcg';

export type RepoTokensWireFormat = 'dtcg' | 'canonical';

export function serializeTokensForRepo(tokens: TokensV1, wireFormat: RepoTokensWireFormat): string {
  if (wireFormat === 'dtcg') {
    return JSON.stringify(serializeDTCG(tokens), null, 2) + '\n';
  }
  return JSON.stringify(tokens, null, 2) + '\n';
}
