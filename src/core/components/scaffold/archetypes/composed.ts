import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';

import { resolveRegistryNodeId } from '../context';
import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import { applyHexFill } from './shared';

function resolveInstanceCount(cardinality: 'one' | 'many', count: number | undefined): number {
  if (cardinality !== 'many') {
    return 1;
  }
  if (count !== undefined) {
    return count;
  }
  return 3;
}

export async function buildComposedVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.clipsContent = false;
  component.primaryAxisSizingMode = 'AUTO';
  component.counterAxisSizingMode = 'AUTO';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.paddingLeft = ctx.spacing.padH;
  component.paddingRight = ctx.spacing.padH;
  component.paddingTop = ctx.spacing.padV;
  component.paddingBottom = ctx.spacing.padV;
  component.itemSpacing = ctx.spacing.gap;
  component.cornerRadius = 6;
  applyHexFill(component, ctx.fills.surface);

  const composes = ctx.spec.composes;
  if (composes === undefined || composes.length === 0) {
    return { component };
  }

  for (let i = 0; i < composes.length; i++) {
    const entry = composes[i];
    const nodeId = resolveRegistryNodeId(ctx.registry, entry.component);
    if (nodeId === null) {
      throw new Error('COMPOSED_CHILD_MISSING: ' + entry.component);
    }

    const main = figma.getNodeById(nodeId);
    if (main === null || main.type !== 'COMPONENT_SET') {
      throw new Error(
        'COMPOSED_CHILD_INVALID: registry node for "' +
          entry.component +
          '" must be a COMPONENT_SET (beta composed scaffold)',
      );
    }

    const slotFrame = figma.createFrame();
    slotFrame.name = 'slot/' + entry.slot;
    slotFrame.layoutMode = 'HORIZONTAL';
    slotFrame.primaryAxisSizingMode = 'AUTO';
    slotFrame.counterAxisSizingMode = 'AUTO';
    slotFrame.primaryAxisAlignItems = 'CENTER';
    slotFrame.counterAxisAlignItems = 'CENTER';
    slotFrame.paddingLeft = 0;
    slotFrame.paddingRight = 0;
    slotFrame.paddingTop = 0;
    slotFrame.paddingBottom = 0;
    slotFrame.itemSpacing = ctx.spacing.gap;
    slotFrame.fills = [];

    const instanceCount = resolveInstanceCount(entry.cardinality, entry.count);
    const componentSet = main as ComponentSetNode;
    for (let n = 0; n < instanceCount; n++) {
      const inst = (componentSet as unknown as ComponentNode).createInstance();
      if (entry.defaultProps !== undefined && typeof inst.setProperties === 'function') {
        try {
          inst.setProperties(entry.defaultProps);
        } catch {
          // Beta composed scaffold — defaultProps are best-effort only.
        }
      }
      slotFrame.appendChild(inst);
    }
    component.appendChild(slotFrame);
  }

  if (component.height <= 2 && component.children.length > 0) {
    component.resize(Math.max(component.width, 48), 32);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'AUTO';
  }

  const violation = assertNoOnePxMaster(component as unknown as FrameNode);
  if (violation !== null) {
    component.resize(component.width, 32);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'AUTO';
  }

  return { component };
}
