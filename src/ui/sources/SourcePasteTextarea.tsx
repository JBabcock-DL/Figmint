import { useCallback, useState } from 'react';

import { loadFromPaste } from '@/io/sources/paste';
import type { LoadedDocument, ValidationError } from '@/io/sources/types';

interface SourcePasteTextareaProps {
  onLoad: (result: LoadedDocument | ValidationError) => void;
}

function formatError(error: ValidationError): string {
  if (error.hint) {
    return `${error.message} (${error.hint})`;
  }
  return error.message;
}

export function SourcePasteTextarea({ onLoad }: SourcePasteTextareaProps) {
  const [error, setError] = useState<ValidationError | null>(null);

  const handleDetect = useCallback(
    async (value: string) => {
      console.debug('[ui/sources] paste detect', { charLength: value.length });
      const result = await loadFromPaste(value);
      if ('payload' in result) {
        setError(null);
        onLoad(result);
      } else {
        setError(result);
      }
    },
    [onLoad],
  );

  return (
    <div>
      <textarea
        placeholder="Paste tokens, ops, or component spec JSON here…"
        onBlur={(event) => {
          void handleDetect(event.target.value);
        }}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxSizing: 'border-box',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '11px',
          height: '280px',
          outlineColor: '#0066ff',
          padding: '8px',
          resize: 'vertical',
          width: '100%',
        }}
      />
      {error ? (
        <p role="alert" style={{ color: '#b00020', fontSize: '11px', margin: '6px 0 0' }}>
          {formatError(error)}
        </p>
      ) : null}
    </div>
  );
}
