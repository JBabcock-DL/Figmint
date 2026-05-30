import type { CatalogEntry } from '@/io/github/catalogDiscovery';

export interface CatalogEntryRowProps {
  entry: CatalogEntry;
  checked: boolean;
  disabled: boolean;
  onToggle: (path: string, checked: boolean) => void;
}

export function CatalogEntryRow({ entry, checked, disabled, onToggle }: CatalogEntryRowProps) {
  return (
    <label
      style={{
        alignItems: 'flex-start',
        display: 'flex',
        fontSize: 11,
        gap: 8,
        marginBottom: 6,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={'Select ' + entry.displayName}
        onChange={function (event) {
          onToggle(entry.path, event.target.checked);
        }}
        style={{ marginTop: 2 }}
      />
      <span>
        <span style={{ display: 'block', fontWeight: 600 }}>{entry.displayName}</span>
        <span style={{ color: '#666', display: 'block', fontSize: 10 }}>{entry.path}</span>
      </span>
    </label>
  );
}
