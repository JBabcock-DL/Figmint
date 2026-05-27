interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
      style={{
        background: '#e8e8e8',
        borderRadius: '4px',
        height: '8px',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          background: '#0a6b0a',
          height: '100%',
          transition: 'width 160ms ease',
          width: `${String(percent)}%`,
        }}
      />
    </div>
  );
}
