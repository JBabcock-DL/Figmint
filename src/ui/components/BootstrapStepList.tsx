import type { BootstrapStepState } from '@/ui/bootstrap/bootstrapProgressReducer';

const STATUS_ICON: Record<BootstrapStepState['status'], string> = {
  pending: '○',
  running: '●',
  done: '✓',
  error: '✗',
  skipped: '⊘',
};

interface BootstrapStepListProps {
  steps: BootstrapStepState[];
}

export function BootstrapStepList({ steps }: BootstrapStepListProps) {
  return (
    <ol
      aria-label="Bootstrap steps"
      style={{
        fontSize: '11px',
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {steps.map(function (step) {
        const icon = STATUS_ICON[step.status];
        const color =
          step.status === 'error'
            ? '#b00020'
            : step.status === 'done'
              ? '#0a6b0a'
              : step.status === 'running'
                ? '#0a3d6b'
                : step.status === 'skipped'
                  ? '#666'
                  : '#888';

        return (
          <li
            key={step.id}
            aria-current={step.status === 'running' ? 'step' : undefined}
            style={{
              alignItems: 'baseline',
              color: color,
              display: 'flex',
              gap: '6px',
              marginBottom: '4px',
            }}
          >
            <span aria-hidden="true" style={{ fontFamily: 'monospace', width: '14px' }}>
              {icon}
            </span>
            <span style={{ flex: 1 }}>{step.label}</span>
            {step.elapsedMs !== undefined ? (
              <span style={{ color: '#666' }}>{String(step.elapsedMs)} ms</span>
            ) : null}
            {step.detail ? (
              <span style={{ color: '#666', flexBasis: '100%', marginLeft: '20px' }}>
                {step.detail}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
