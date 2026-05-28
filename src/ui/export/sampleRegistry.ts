import type { RegistryV1 } from '@detroitlabs/figmint-contracts';

import registryPayload from '../../../tests/fixtures/ui/export/registry.json';

/** Sample registry for Export tab sandbox (WO-026 Step 13). WO-027 replaces with Components tab flow. */
export const sampleRegistryDocument = registryPayload as RegistryV1;
