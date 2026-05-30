import { ExportSheet } from '@/ui/components/ExportSheet';
import { useFigmaFileKey } from '@/ui/figma/useFigmaFileKey';
import { prepareHandoffExport } from '@/ui/handoff/prepareHandoffExport';
import { useHandoffCapture } from '@/ui/handoff/useHandoffCapture';
import { useHandoffSelection } from '@/ui/handoff/useHandoffSelection';
import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';

export interface HandoffProps {
  github?: UseGitHubConnectResult;
  repoUrl?: string;
}

export function Handoff(_props: HandoffProps) {
  const selection = useHandoffSelection();
  const figmaFileKey = useFigmaFileKey();
  const { state: captureState, capture } = useHandoffCapture();
  const { capturing, markdown, document, warnings, error } = captureState;

  const exportPrepared = document !== null ? prepareHandoffExport(document) : null;
  const captureDisabled = selection.count === 0 || capturing;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        disabled={captureDisabled}
        aria-disabled={selection.count === 0}
        aria-busy={capturing}
        onClick={capture}
        style={{
          alignSelf: 'flex-start',
          border: '1px solid #ccc',
          borderRadius: 4,
          cursor: captureDisabled ? 'not-allowed' : 'pointer',
          fontSize: 11,
          fontWeight: 600,
          opacity: captureDisabled ? 0.5 : 1,
          padding: '6px 12px',
        }}
      >
        {capturing ? 'Capturing…' : 'Capture selection'}
      </button>

      <p role="status" style={{ color: '#666', fontSize: 11, margin: 0 }}>
        {selection.count === 0
          ? 'Select one or more frames in the canvas.'
          : String(selection.count) +
            ' frame(s) selected — ' +
            selection.names.join(', ')}
      </p>

      <p role="status" style={{ color: '#666', fontSize: 10, margin: 0 }}>
        {figmaFileKey.statusMessage}
        {figmaFileKey.source === 'none'
          ? ' Set a file key in Settings for deep links.'
          : ''}
      </p>

      {warnings.length > 0 ? (
        <ul
          style={{
            color: '#9a6700',
            fontSize: 10,
            lineHeight: 1.45,
            margin: 0,
            paddingLeft: 16,
          }}
        >
          {warnings.map(function (warning, index) {
            return <li key={String(index)}>{warning}</li>;
          })}
        </ul>
      ) : null}

      {error.length > 0 ? (
        <p role="alert" style={{ color: '#b00020', fontSize: 11, margin: 0 }}>
          {error}
        </p>
      ) : null}

      <pre
        aria-label="Handoff preview"
        style={{
          background: '#fafafa',
          border: '1px solid #ddd',
          borderRadius: 4,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 10,
          lineHeight: 1.45,
          margin: 0,
          maxHeight: 240,
          overflow: 'auto',
          padding: 8,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {markdown.length > 0 ? markdown : 'Capture a selection to preview handoff markdown.'}
      </pre>

      {exportPrepared !== null && !capturing ? (
        <ExportSheet
          document={exportPrepared.doc}
          defaultSinks={exportPrepared.defaultSinks}
          title="Export handoff"
        />
      ) : null}
    </div>
  );
}
