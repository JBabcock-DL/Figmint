const PROBE_COLLECTION_NAME = '__figmint_evc_probe__';
const PROBE_EXTENSION_NAME = '__probe__';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return record.message;
    }
  }
  return String(error);
}

function removeProbeCollection(collection: VariableCollection): void {
  if (typeof collection.remove === 'function') {
    collection.remove();
  }
}

/** Ephemeral extend() probe — true only when extend succeeds without throw. */
export function isEnterprise(): Promise<boolean> {
  const probe = figma.variables.createVariableCollection(PROBE_COLLECTION_NAME);
  try {
    probe.extend(PROBE_EXTENSION_NAME);
    return Promise.resolve(true);
  } catch (error) {
    const message = extractErrorMessage(error);
    if (message.includes('enterprise plan')) {
      return Promise.resolve(false);
    }
    return Promise.resolve(false);
  } finally {
    removeProbeCollection(probe);
  }
}
