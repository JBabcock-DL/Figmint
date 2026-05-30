export type ImportFramework = 'react' | 'vue' | 'wc' | 'swiftui' | 'compose';

export interface FrameworkPickerProps {
  value: ImportFramework;
  onChange: (value: ImportFramework) => void;
}

const PHASE_4A_ENABLED: ImportFramework[] = ['react'];

const OPTIONS: { value: ImportFramework; label: string }[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'wc', label: 'Web Components' },
  { value: 'swiftui', label: 'SwiftUI' },
  { value: 'compose', label: 'Compose' },
];

function isEnabled(framework: ImportFramework): boolean {
  for (let i = 0; i < PHASE_4A_ENABLED.length; i++) {
    if (PHASE_4A_ENABLED[i] === framework) {
      return true;
    }
  }
  return false;
}

export function FrameworkPicker(props: FrameworkPickerProps) {
  return (
    <label style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
      Framework
      <select
        value={props.value}
        onChange={function (event) {
          props.onChange(event.target.value as ImportFramework);
        }}
        style={{
          boxSizing: 'border-box',
          display: 'block',
          fontSize: 11,
          marginTop: 4,
          padding: '6px 8px',
          width: '100%',
        }}
      >
        {OPTIONS.map(function (option) {
          const enabled = isEnabled(option.value);
          return (
            <option
              key={option.value}
              value={option.value}
              disabled={!enabled}
              title={enabled ? undefined : 'Coming in a later sprint'}
            >
              {option.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
