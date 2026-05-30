import * as React from 'react';

import { cn } from '@/lib/utils';

import { Badge } from './badge';
import { Button } from './button';
import { Icon } from './icon';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  showAction?: boolean;
}

/**
 * Composed alert for sandbox VQA:
 * - Icon → registered (`icon` in `.fighub-registry.json`)
 * - Button → registered after first scaffold (`button`)
 * - Badge → intentionally absent from registry (unknown dependency)
 */
export function Alert({ className, title, showAction = true, children, ...props }: AlertProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <Icon name="alert" />
        <strong>{title}</strong>
        <Badge variant="outline">New</Badge>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
      {showAction ? (
        <Button variant="outline" size="sm">
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}
