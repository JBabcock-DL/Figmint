import { useCallback, useRef, useState, type DragEvent } from 'react';

import { loadFromFile } from '@/io/sources/file';
import type { LoadedDocument, ValidationError } from '@/io/sources/types';

interface SourceFilePickerProps {
  onLoad: (result: LoadedDocument | ValidationError) => void;
}

export function SourceFilePicker({ onLoad }: SourceFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      console.debug('[ui/sources] file picker selected', file.name);
      const result = await loadFromFile(file, 'picker');
      onLoad(result);
      event.target.value = '';
    },
    [onLoad],
  );

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.md"
        style={{ display: 'none' }}
        onChange={(event) => {
          void handleChange(event);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '6px 12px',
        }}
      >
        Choose file…
      </button>
    </div>
  );
}

interface SourceDropZoneProps {
  onLoad: (result: LoadedDocument | ValidationError) => void;
}

export function SourceDropZone({ onLoad }: SourceDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files.item(0);
      if (file === null) {
        return;
      }
      console.debug('[ui/sources] drop zone received', file.name);
      const result = await loadFromFile(file, 'dragdrop');
      onLoad(result);
    },
    [onLoad],
  );

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => {
        setDragOver(false);
      }}
      onDrop={(event) => {
        void handleDrop(event);
      }}
      style={{
        background: dragOver ? '#eef6ff' : '#fafafa',
        border: dragOver ? '2px dashed #0066ff' : '2px dashed #ccc',
        borderRadius: '4px',
        color: '#666',
        fontSize: '12px',
        padding: '16px',
        textAlign: 'center',
      }}
    >
      Drag and drop a .json or .md file here
    </div>
  );
}
