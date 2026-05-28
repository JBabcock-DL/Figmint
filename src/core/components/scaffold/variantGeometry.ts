import { reassertHug } from '@/core/canvas/helpers/autoLayout';

export interface NormalizeVariantGeometryOptions {
  minWidth?: number;
  minHeight?: number;
}

/**
 * Post-combine pass — Figma may collapse variant masters when the ComponentSet grid
 * uses FIXED×AUTO sizing. Restores hug sizing and a minimum readable footprint.
 */
export function normalizeVariantMasterGeometry(
  variant: ComponentNode,
  options?: NormalizeVariantGeometryOptions,
): void {
  const minWidth = options !== undefined && options.minWidth !== undefined ? options.minWidth : 48;
  const minHeight =
    options !== undefined && options.minHeight !== undefined ? options.minHeight : 32;

  if (variant.layoutMode === 'NONE') {
    return;
  }

  variant.layoutSizingHorizontal = 'HUG';
  variant.layoutSizingVertical = 'HUG';
  variant.primaryAxisSizingMode = 'AUTO';
  variant.counterAxisSizingMode = 'AUTO';
  reassertHug(variant as unknown as FrameNode);

  if (variant.width < minWidth || variant.height < minHeight) {
    variant.resize(Math.max(variant.width, minWidth), Math.max(variant.height, minHeight));
    variant.primaryAxisSizingMode = 'AUTO';
    variant.counterAxisSizingMode = 'AUTO';
    reassertHug(variant as unknown as FrameNode);
  }
}

export function normalizeVariantMastersInSet(componentSet: ComponentSetNode): void {
  for (let i = 0; i < componentSet.children.length; i++) {
    const child = componentSet.children[i];
    if (child.type === 'COMPONENT') {
      normalizeVariantMasterGeometry(child as ComponentNode);
    }
  }
}
