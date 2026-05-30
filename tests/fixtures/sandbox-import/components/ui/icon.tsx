import * as React from 'react';

import { cn } from '@/lib/utils';

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name?: 'check' | 'alert';
}

/** Minimal icon chip used as a registered sub-component in sandbox import VQA. */
export function Icon({ className, name = 'check', ...props }: IconProps) {
  return (
    <svg
      className={cn('h-4 w-4 text-primary-foreground', className)}
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...props}
    >
      {name === 'check' ? (
        <path d="M3 8.5 6.5 12 13 4" fill="none" stroke="currentColor" strokeWidth="2" />
      ) : (
        <path d="M8 4v5M8 11v1" fill="none" stroke="currentColor" strokeWidth="2" />
      )}
    </svg>
  );
}
