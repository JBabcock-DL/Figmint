import type { DriftEntry } from '@detroitlabs/fighub-contracts';

function previewValue(value: unknown): string {
  const raw = JSON.stringify(value);
  if (raw.length <= 200) {
    return raw;
  }
  return raw.slice(0, 197) + '…';
}

export interface ConflictResolverProps {
  drift: DriftEntry;
  onKeepFigma: () => void;
  onKeepRepo: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function ConflictResolver(props: ConflictResolverProps) {
  return (
    <div
      role="region"
      aria-label={'Conflict resolver for ' + props.drift.id}
      style={{
        background: '#fafafa',
        border: '1px solid #ccc',
        borderRadius: '6px',
        marginTop: '8px',
        padding: '8px',
      }}
    >
      <div
        style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
      >
        <div>
          <strong style={{ fontSize: '10px' }}>Last synced</strong>
          <pre style={{ fontSize: '9px', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
            {previewValue(props.drift.lastSynced)}
          </pre>
        </div>
        <div>
          <strong style={{ fontSize: '10px' }}>Figma</strong>
          <pre style={{ fontSize: '9px', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
            {previewValue(props.drift.figma)}
          </pre>
        </div>
        <div>
          <strong style={{ fontSize: '10px' }}>Repo</strong>
          <pre style={{ fontSize: '9px', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
            {previewValue(props.drift.repo)}
          </pre>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label="Resolution choice"
        style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}
      >
        <button
          type="button"
          onClick={props.onKeepFigma}
          style={{ fontSize: '10px', minHeight: '32px' }}
        >
          Keep Figma
        </button>
        <button
          type="button"
          onClick={props.onKeepRepo}
          style={{ fontSize: '10px', minHeight: '32px' }}
        >
          Keep Repo
        </button>
        <button
          type="button"
          onClick={props.onSkip}
          style={{ fontSize: '10px', minHeight: '32px' }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={props.onClose}
          style={{ fontSize: '10px', minHeight: '32px' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
