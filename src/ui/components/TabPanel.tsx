import type { ReactNode } from 'react';

export interface TabPanelProps {
  id: string;
  active: boolean;
  children: ReactNode;
}

/**
 * Keep tab content mounted while hidden so in-session React state survives tab switches.
 * Inactive panels use `hidden` + `display: none` (not conditional unmount).
 */
export function TabPanel({ id, active, children }: TabPanelProps) {
  return (
    <section
      id={id}
      role="tabpanel"
      hidden={!active}
      aria-hidden={!active}
      style={{
        display: active ? 'flex' : 'none',
        flex: 1,
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0,
        overflow: 'auto',
      }}
    >
      {children}
    </section>
  );
}
