import type { ReactNode } from 'react';

import type { DriftEntry, DriftReportSummary } from '@detroitlabs/fighub-contracts';

import type { ResolutionChoice } from '@/io/messages/drift';

import type { DriftFilter } from '@/ui/drift/resolutionReducer';

export function DriftSummaryBadge(props: { summary: DriftReportSummary | null }) {
  if (props.summary === null) {
    return (
      <span role="status" style={{ color: '#666', fontSize: '11px' }}>
        No drift detected yet
      </span>
    );
  }
  return (
    <span role="status" style={{ fontSize: '11px', fontWeight: 600 }}>
      {String(props.summary.push)}↑ {String(props.summary.pull)}↓ {String(props.summary.conflict)}⚠
    </span>
  );
}

export interface DriftListProps {
  drifts: DriftEntry[];
  filter: DriftFilter;
  selectedIds: Set<string>;
  resolutions: Map<string, ResolutionChoice>;
  openConflictId: string | null;
  onFilterChange: (filter: DriftFilter) => void;
  onToggleSelect: (driftId: string) => void;
  onRowAction: (driftId: string, action: 'push' | 'pull' | 'skip') => void;
  onOpenConflict: (driftId: string) => void;
  renderConflictResolver?: (drift: DriftEntry) => ReactNode;
}

const FILTERS: DriftFilter[] = ['all', 'push', 'pull', 'conflict'];

function filterLabel(filter: DriftFilter): string {
  if (filter === 'all') {
    return 'All';
  }
  if (filter === 'push') {
    return 'Push ↑';
  }
  if (filter === 'pull') {
    return 'Pull ↓';
  }
  return 'Conflict ⚠';
}

export function DriftList(props: DriftListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div role="tablist" aria-label="Drift filters" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {FILTERS.map(function (filter) {
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={props.filter === filter}
              onClick={function () {
                props.onFilterChange(filter);
              }}
              style={{
                minHeight: '44px',
                minWidth: '44px',
                fontSize: '11px',
                fontWeight: props.filter === filter ? 700 : 500,
                padding: '6px 10px',
              }}
            >
              {filterLabel(filter)}
            </button>
          );
        })}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {props.drifts.map(function (drift) {
          const selected = props.selectedIds.has(drift.id);
          const resolved = props.resolutions.has(drift.id);
          return (
            <li
              key={drift.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '8px',
                background: selected ? '#f7fbff' : '#fff',
              }}
            >
              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '11px' }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={function () {
                    props.onToggleSelect(drift.id);
                  }}
                />
                <span style={{ flex: 1 }}>
                  <strong>{drift.id}</strong>
                  <span style={{ color: '#666', marginLeft: '6px' }}>{drift.kind}</span>
                  <span style={{ marginLeft: '6px' }}>{drift.direction}</span>
                  {resolved ? <span style={{ color: '#0a0', marginLeft: '6px' }}>resolved</span> : null}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={drift.direction !== 'push' && drift.direction !== 'conflict'}
                  onClick={function () {
                    props.onRowAction(drift.id, 'push');
                  }}
                  style={{ fontSize: '10px', minHeight: '32px', padding: '4px 8px' }}
                >
                  Push
                </button>
                <button
                  type="button"
                  disabled={drift.direction !== 'pull' && drift.direction !== 'conflict'}
                  onClick={function () {
                    props.onRowAction(drift.id, 'pull');
                  }}
                  style={{ fontSize: '10px', minHeight: '32px', padding: '4px 8px' }}
                >
                  Pull
                </button>
                <button
                  type="button"
                  onClick={function () {
                    props.onRowAction(drift.id, 'skip');
                  }}
                  style={{ fontSize: '10px', minHeight: '32px', padding: '4px 8px' }}
                >
                  Skip
                </button>
                {drift.direction === 'conflict' ? (
                  <button
                    type="button"
                    onClick={function () {
                      props.onOpenConflict(drift.id);
                    }}
                    style={{ fontSize: '10px', minHeight: '32px', padding: '4px 8px' }}
                  >
                    Resolve…
                  </button>
                ) : null}
              </div>
              {props.openConflictId === drift.id && props.renderConflictResolver
                ? props.renderConflictResolver(drift)
                : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
