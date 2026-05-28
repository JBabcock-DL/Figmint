import { STATE_OPACITY } from './constants';

export type ButtonStateKey = 'default' | 'hover' | 'pressed' | 'disabled';

/**
 * Apply matrix state simulation via instance opacity — §13.1.a verbatim.
 * `default` and unknown keys resolve to full opacity (1).
 */
export function applyButtonStateOverride(instance: InstanceNode, stateKey: ButtonStateKey): void {
  instance.opacity = STATE_OPACITY[stateKey as keyof typeof STATE_OPACITY] ?? 1;
}
