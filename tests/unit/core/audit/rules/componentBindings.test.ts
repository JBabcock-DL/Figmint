import { describe, expect, it } from 'vitest';

import {
  checkCompBindingNodeResolved,
  checkCompBindingVariableResolved,
  checkCompBindingVerified,
  checkCompBindingsAllApplied,
} from '@/core/audit/rules/componentBindings';
import type { ComponentAuditInput } from '@/core/components/scaffold/types';

import chipSpec from '../../../../fixtures/components/button-chip-bindings.v1.json';
import { buildMockVariantTree } from '../../../../helpers/scaffold/mockVariantTree';

function baseInput(bindingsResult: ComponentAuditInput['bindingsResult']): ComponentAuditInput {
  const { componentSet } = buildMockVariantTree(1);
  return {
    spec: chipSpec as ComponentAuditInput['spec'],
    componentSet: componentSet as unknown as ComponentSetNode,
    bindingsResult: bindingsResult,
  };
}

describe('component binding audit rules', () => {
  it('comp/bindings-all-applied passes when no failures', () => {
    const result = checkCompBindingsAllApplied(
      baseInput({ applied: 11, failed: [], passed: true }),
    );
    expect(result.pass).toBe(true);
  });

  it('comp/bindings-all-applied fails with count', () => {
    const result = checkCompBindingsAllApplied(
      baseInput({
        applied: 0,
        passed: false,
        failed: [{ selector: 'root.fill', variable: 'x', reason: 'api-error', diagnostic: 'x' }],
      }),
    );
    expect(result.pass).toBe(false);
    expect(result.diagnostic).toContain('1 binding(s) failed');
  });

  it('comp/binding-variable-resolved fails per missing variable', () => {
    const result = checkCompBindingVariableResolved(
      baseInput({
        applied: 0,
        passed: false,
        failed: [
          {
            selector: 'root.fill',
            variable: 'color/primary/default',
            reason: 'missing-variable',
            diagnostic: 'Missing variable: color/primary/default (selector root.fill)',
          },
        ],
      }),
    );
    expect(result.pass).toBe(false);
    expect(result.diagnostic).toContain('root.fill');
  });

  it('comp/binding-node-resolved fails per missing node', () => {
    const result = checkCompBindingNodeResolved(
      baseInput({
        applied: 0,
        passed: false,
        failed: [
          {
            selector: 'text/label.fill',
            variable: 'color/on-primary/default',
            reason: 'missing-node',
            diagnostic: 'Missing node: text/label (selector text/label.fill)',
          },
        ],
      }),
    );
    expect(result.pass).toBe(false);
    expect(result.diagnostic).toContain('text/label');
  });

  it('comp/binding-verified fails when bind is absent on first variant', () => {
    const input = baseInput({ applied: 11, failed: [], passed: true });
    const result = checkCompBindingVerified(input);
    expect(result.pass).toBe(false);
    expect(result.diagnostic).toContain('root.fill');
  });
});
