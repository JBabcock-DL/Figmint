import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { applyProperties } from './applyProperties';
import type { ApplyBindingsRunner, ApplyPropertiesResult } from './types';

/**
 * Post-scaffold pipeline: applyBindings (WO-023) must run before applyProperties (WO-024).
 * WO-027 / Components tab pass the real applyBindings when WO-023 is merged.
 */
export async function runBindingsThenProperties(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
  applyBindings: ApplyBindingsRunner,
): Promise<ApplyPropertiesResult> {
  await applyBindings(spec, componentSet);
  return applyProperties(spec, componentSet);
}
