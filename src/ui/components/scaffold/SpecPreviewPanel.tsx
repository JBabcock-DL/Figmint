import type { CSSProperties } from 'react';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import type { SpecValidationResult } from '@/ui/components/scaffold/validateSpecDraft';

export interface SpecPreviewPanelProps {
  draft: ComponentSpecV1 | null;
  variantCount: number;
  selectorWarnings: string[];
  validation: SpecValidationResult | null;
  onEditVariantMatrix: (json: string) => void;
  onEditProps: (json: string) => void;
  onEditBindings: (json: string) => void;
}

const textareaStyle: CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '10px',
  minHeight: '80px',
  width: '100%',
  boxSizing: 'border-box',
};

export function SpecPreviewPanel({
  draft,
  variantCount,
  selectorWarnings,
  validation,
  onEditVariantMatrix,
  onEditProps,
  onEditBindings,
}: SpecPreviewPanelProps) {
  if (draft === null) {
    return (
      <p style={{ color: '#666', fontSize: 11, margin: 0 }}>
        Load a component spec from the registry or paste JSON to preview.
      </p>
    );
  }

  const bindingPreview = draft.bindings.slice(0, 3);
  const bindingExtra =
    draft.bindings.length > 3 ? ' (+' + String(draft.bindings.length - 3) + ' more)' : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11 }}>
        <strong>{draft.name}</strong>
        {' · '}
        {draft.framework}
        {' · '}
        {draft.archetype !== undefined ? draft.archetype : 'chip'}
        {' · '}
        {draft.layout.direction}
      </div>
      <span
        style={{
          alignSelf: 'flex-start',
          background: '#f0f0f0',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
        }}
      >
        {String(variantCount)} variants
      </span>
      <p style={{ color: '#666', fontSize: 10, margin: 0 }}>
        Doc pipeline: header → properties → component set → matrix → Do/Don&apos;t usage
      </p>
      {bindingPreview.length > 0 ? (
        <p style={{ color: '#666', fontSize: 10, margin: 0 }}>
          Bindings: {bindingPreview.map(function (b) { return b.selector; }).join(', ')}
          {bindingExtra}
        </p>
      ) : null}
      {selectorWarnings.length > 0 ? (
        <ul style={{ color: '#b45309', fontSize: 10, margin: 0, paddingLeft: 16 }}>
          {selectorWarnings.map(function (warning) {
            return <li key={warning}>{warning}</li>;
          })}
        </ul>
      ) : null}
      {validation !== null && !validation.ok ? (
        <ul style={{ color: '#b00020', fontSize: 10, margin: 0, paddingLeft: 16 }}>
          {validation.errors.map(function (err) {
            return <li key={err}>{err}</li>;
          })}
        </ul>
      ) : null}
      <label style={{ fontSize: 10, fontWeight: 600 }}>
        variantMatrix
        <textarea
          style={textareaStyle}
          value={JSON.stringify(draft.variantMatrix, null, 2)}
          onChange={function (event) {
            onEditVariantMatrix(event.target.value);
          }}
        />
      </label>
      <label style={{ fontSize: 10, fontWeight: 600 }}>
        props
        <textarea
          style={textareaStyle}
          value={JSON.stringify(draft.props, null, 2)}
          onChange={function (event) {
            onEditProps(event.target.value);
          }}
        />
      </label>
      <label style={{ fontSize: 10, fontWeight: 600 }}>
        bindings
        <textarea
          style={textareaStyle}
          value={JSON.stringify(draft.bindings, null, 2)}
          onChange={function (event) {
            onEditBindings(event.target.value);
          }}
        />
      </label>
    </div>
  );
}
