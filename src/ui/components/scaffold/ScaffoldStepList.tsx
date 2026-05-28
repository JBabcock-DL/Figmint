import type { ScaffoldStepId } from '@/io/messages/scaffold';

import { countCompletedSteps, type ScaffoldStepState } from '@/ui/components/scaffold/scaffoldProgressReducer';
import { ProgressBar } from '@/ui/components/ProgressBar';

const STATUS_ICON: Record<ScaffoldStepState['status'], string> = {
  pending: '○',
  running: '●',
  done: '✓',
  error: '✗',
  skipped: '⊘',
};

interface ScaffoldStepListProps {
  steps: ScaffoldStepState[];
  failedStep?: ScaffoldStepId | null;
}

export function ScaffoldStepList({ steps, failedStep }: ScaffoldStepListProps) {
  const completed = countCompletedSteps(steps);

  return (
    <div>
      <ProgressBar
        value={completed}
        max={steps.length}
        label="Scaffold step progress"
      />
      <ol
        aria-label="Scaffold steps"
        style={{
          fontSize: '11px',
          listStyle: 'none',
          margin: '8px 0 0',
          padding: 0,
        }}
      >
        {steps.map(function (step) {
          const icon = STATUS_ICON[step.status];
          const isFailed = failedStep === step.id || step.status === 'error';
          const color = isFailed
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
                background: isFailed ? '#fde8e8' : undefined,
                borderRadius: isFailed ? 4 : undefined,
                color: color,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '4px',
                padding: isFailed ? '2px 4px' : undefined,
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
    </div>
  );
}
