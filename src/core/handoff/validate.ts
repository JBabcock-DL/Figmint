import Ajv from 'ajv';
import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';
import handoffSchemaRaw from '@detroitlabs/fighub-contracts/schemas/handoff-context.v1';

const schemaRecord = Object.assign({}, handoffSchemaRaw as Record<string, unknown>);
delete schemaRecord.$schema;

const ajv = new Ajv({ validateSchema: false });
const validateHandoffContextV1 = ajv.compile(schemaRecord);

export function assertHandoffContextV1(doc: unknown): asserts doc is HandoffContextV1 {
  if (!validateHandoffContextV1(doc)) {
    const detail =
      validateHandoffContextV1.errors !== null && validateHandoffContextV1.errors !== undefined
        ? JSON.stringify(validateHandoffContextV1.errors)
        : 'unknown validation error';
    throw new Error('Invalid HandoffContextV1: ' + detail);
  }
}
