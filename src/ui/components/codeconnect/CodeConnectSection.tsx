import { useCallback, useMemo, useState } from 'react';

import { flags } from '@/config/flags';
import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';
import { useCodeConnectDetect } from '@/ui/hooks/useCodeConnectDetect';
import { useCodeConnectEmitPr } from '@/ui/hooks/useCodeConnectEmitPr';

export interface CodeConnectSectionProps {
  repoUrl: string;
  github: UseGitHubConnectResult;
  onOpenSettings?: () => void;
  sectionBorder: React.CSSProperties;
  sectionHeading: React.CSSProperties;
}

export function CodeConnectSection(props: CodeConnectSectionProps) {
  const { state: detectState, scan } = useCodeConnectDetect();
  const { state: emitState, emitPr } = useCodeConnectEmitPr();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(
    function () {
      const set: Record<string, boolean> = {};
      for (let i = 0; i < selectedIds.length; i++) {
        set[selectedIds[i]] = true;
      }
      return set;
    },
    [selectedIds],
  );

  const toggleId = useCallback(function (nodeId: string) {
    setSelectedIds(function (prev) {
      const next: string[] = [];
      let found = false;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] === nodeId) {
          found = true;
          continue;
        }
        next.push(prev[i]);
      }
      if (!found) {
        next.push(nodeId);
      }
      return next;
    });
  }, []);

  if (!flags.codeConnectPR || !props.github.connected) {
    return null;
  }

  return (
    <section style={props.sectionBorder} aria-label="Code Connect">
      <h2 style={props.sectionHeading}>Code Connect</h2>
      <p style={{ color: '#666', fontSize: 10, lineHeight: 1.45, margin: '0 0 8px' }}>
        Generate Code Connect stub files in one PR. Plugin does not publish mappings.
      </p>

      <button
        type="button"
        disabled={detectState.scanning || props.repoUrl.length === 0}
        onClick={function () {
          scan({ repoUrl: props.repoUrl });
          setSelectedIds([]);
        }}
        style={{
          border: '1px solid #ccc',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 8,
          padding: '4px 10px',
        }}
      >
        {detectState.scanning ? 'Scanning…' : 'Scan for unmapped'}
      </button>

      {detectState.error.length > 0 ? (
        <p role="alert" style={{ color: '#b00020', fontSize: 11, margin: '0 0 8px' }}>
          {detectState.error}
        </p>
      ) : null}

      {detectState.unmapped.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <button
              type="button"
              onClick={function () {
                const all: string[] = [];
                for (let i = 0; i < detectState.unmapped.length; i++) {
                  all.push(detectState.unmapped[i].nodeId);
                }
                setSelectedIds(all);
              }}
              style={{ fontSize: 10 }}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={function () {
                setSelectedIds([]);
              }}
              style={{ fontSize: 10 }}
            >
              Clear
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {detectState.unmapped.map(function (item) {
              const inputId = 'cc-unmapped-' + item.nodeId.replace(/:/g, '-');
              return (
                <li key={item.nodeId} style={{ marginBottom: 4 }}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={selectedSet[item.nodeId] === true}
                    onChange={function () {
                      toggleId(item.nodeId);
                    }}
                  />
                  <label htmlFor={inputId} style={{ fontSize: 11, marginLeft: 6 }}>
                    {item.name}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        disabled={selectedIds.length === 0 || emitState.emitting}
        aria-disabled={selectedIds.length === 0 || emitState.emitting}
        onClick={function () {
          emitPr({ repoUrl: props.repoUrl, componentIds: selectedIds });
        }}
        style={{
          border: '1px solid #ccc',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          opacity: selectedIds.length === 0 || emitState.emitting ? 0.5 : 1,
          padding: '4px 10px',
        }}
      >
        {emitState.emitting ? 'Opening PR…' : 'Emit Code Connect PR'}
      </button>

      {emitState.error.length > 0 ? (
        <p role="alert" style={{ color: '#b00020', fontSize: 11, margin: '8px 0 0' }}>
          {emitState.code.length > 0 ? emitState.code + ': ' : ''}
          {emitState.error}
        </p>
      ) : null}

      {emitState.prUrl.length > 0 ? (
        <p role="status" style={{ color: '#333', fontSize: 11, margin: '8px 0 0' }}>
          PR opened:{' '}
          <a href={emitState.prUrl} target="_blank" rel="noopener noreferrer">
            {emitState.prUrl}
          </a>
        </p>
      ) : null}

      {props.onOpenSettings !== undefined ? (
        <button
          type="button"
          onClick={props.onOpenSettings}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 10,
            marginTop: 6,
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          Edit repo connection in Settings
        </button>
      ) : null}
    </section>
  );
}
