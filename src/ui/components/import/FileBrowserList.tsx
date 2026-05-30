import { useMemo, useState } from 'react';

export interface FileBrowserListProps {
  files: { path: string; name: string }[];
  rootPath: string;
  selectedPath: string;
  onSelect: (path: string) => void;
}

export function FileBrowserList(props: FileBrowserListProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    function () {
      const needle = filter.trim().toLowerCase();
      if (needle.length === 0) {
        return props.files;
      }
      const result: { path: string; name: string }[] = [];
      for (let i = 0; i < props.files.length; i++) {
        const file = props.files[i];
        if (file.name.toLowerCase().includes(needle)) {
          result.push(file);
        }
      }
      return result;
    },
    [props.files, filter],
  );

  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>
        Filter files
        <input
          type="search"
          value={filter}
          onChange={function (event) {
            setFilter(event.target.value);
          }}
          style={{
            boxSizing: 'border-box',
            display: 'block',
            fontSize: 11,
            marginTop: 4,
            padding: '6px 8px',
            width: '100%',
          }}
        />
      </label>
      <div
        role="listbox"
        aria-label="Repository component files"
        style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #eee', borderRadius: 4 }}
      >
        {filtered.length === 0 ? (
          <p style={{ color: '#666', fontSize: 10, margin: 8 }}>
            No .tsx files found under {props.rootPath}.
          </p>
        ) : (
          filtered.map(function (file) {
            const selected = file.path === props.selectedPath;
            return (
              <button
                key={file.path}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={function () {
                  props.onSelect(file.path);
                }}
                style={{
                  background: selected ? '#f0f0f0' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'block',
                  fontSize: 11,
                  padding: '6px 8px',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {file.name}
                <span style={{ color: '#999', fontSize: 10, marginLeft: 6 }}>{file.path}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
