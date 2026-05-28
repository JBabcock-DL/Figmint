import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

export type SpecValidationResult = { ok: true } | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateVariantMatrix(matrix: unknown, errors: string[]): void {
  if (!isRecord(matrix)) {
    errors.push('variantMatrix must be a JSON object');
    return;
  }
  const keys = Object.keys(matrix);
  if (keys.length === 0) {
    errors.push('variantMatrix must include at least one axis');
    return;
  }
  for (let i = 0; i < keys.length; i++) {
    const axis = matrix[keys[i]];
    if (!Array.isArray(axis) || axis.length === 0) {
      errors.push('variantMatrix axis "' + keys[i] + '" must be a non-empty array');
    }
  }
}

function validateLayout(layout: unknown, errors: string[]): void {
  if (!isRecord(layout)) {
    errors.push('layout must be a JSON object');
    return;
  }
  if (layout.direction !== 'horizontal' && layout.direction !== 'vertical') {
    errors.push('layout.direction must be horizontal or vertical');
  }
  if (typeof layout.gap !== 'string') {
    errors.push('layout.gap must be a string');
  }
  if (!isRecord(layout.sizing)) {
    errors.push('layout.sizing must be an object');
  }
}

export async function validateComponentSpecDraft(
  draft: ComponentSpecV1,
): Promise<SpecValidationResult> {
  const errors: string[] = [];

  if (draft.v !== 1) {
    errors.push('Expected v: 1');
  }
  if (draft.kind !== 'component-spec') {
    errors.push('Expected kind: "component-spec"');
  }
  if (typeof draft.name !== 'string' || draft.name.length === 0) {
    errors.push('name must be a non-empty string');
  }
  if (typeof draft.framework !== 'string') {
    errors.push('framework is required');
  }
  if (!Array.isArray(draft.props)) {
    errors.push('props must be an array');
  }
  if (!Array.isArray(draft.bindings)) {
    errors.push('bindings must be an array');
  }

  validateVariantMatrix(draft.variantMatrix, errors);
  validateLayout(draft.layout, errors);

  if (errors.length > 0) {
    return { ok: false, errors: errors };
  }
  return { ok: true };
}

export function validateSpecJsonField(
  fieldName: string,
  jsonText: string,
): { ok: true; value: unknown } | { ok: false; errors: string[] } {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, errors: ['Invalid JSON in ' + fieldName] };
  }
}
