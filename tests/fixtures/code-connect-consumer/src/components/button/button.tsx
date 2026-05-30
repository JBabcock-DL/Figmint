import * as React from 'react';

export interface ButtonProps {
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  label?: string;
}

export function Button(props: ButtonProps): React.ReactElement {
  return React.createElement('button', { disabled: props.disabled }, props.label);
}
