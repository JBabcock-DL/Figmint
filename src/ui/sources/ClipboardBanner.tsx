import { useEffect, useState } from 'react';

import { loadFromPasteEvent, probeClipboard } from '@/io/sources/clipboard';
import type { LoadedDocument } from '@/io/sources/types';

interface ClipboardBannerProps {
  doc: LoadedDocument;
  onLoad: (doc: LoadedDocument) => void;
  onDismiss: () => void;
}

export function ClipboardBanner({ doc, onLoad, onDismiss }: ClipboardBannerProps) {
  return (
    <div
      role="status"
      style={{
        alignItems: 'center',
        background: '#eef6ff',
        border: '1px solid #0066ff',
        borderRadius: '4px',
        display: 'flex',
        fontSize: '12px',
        gap: '8px',
        justifyContent: 'space-between',
        padding: '8px 12px',
      }}
    >
      <span>
        Load detected <strong>{doc.kind}</strong> from clipboard?
      </span>
      <span style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => {
            onLoad(doc);
          }}
          style={{
            background: '#0066ff',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '4px 10px',
          }}
        >
          Load
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '4px 10px',
          }}
        >
          Dismiss
        </button>
      </span>
    </div>
  );
}

export function useClipboardSources(onLoad: (doc: LoadedDocument) => void) {
  const [pendingDoc, setPendingDoc] = useState<LoadedDocument | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void probeClipboard().then((probe) => {
      if (cancelled || !probe.available || !probe.doc) {
        return;
      }
      setPendingDoc(probe.doc);
    });

    const handlePaste = (event: ClipboardEvent) => {
      void loadFromPasteEvent(event).then((result) => {
        if (cancelled || result === null || !('payload' in result)) {
          return;
        }
        setDismissed(false);
        setPendingDoc(result);
      });
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      cancelled = true;
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const bannerDoc = dismissed ? null : pendingDoc;

  return {
    bannerDoc,
    dismissBanner: () => {
      setDismissed(true);
    },
    acceptBanner: (doc: LoadedDocument) => {
      setDismissed(true);
      setPendingDoc(null);
      onLoad(doc);
    },
  };
}
