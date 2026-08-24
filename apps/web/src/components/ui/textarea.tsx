import * as React from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[100px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
