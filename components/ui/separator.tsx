import * as React from 'react';

import { cn } from '@/lib/utils';

const Separator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, orientation = 'horizontal', decorative = true, role, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? 'none' : role ?? 'separator'}
      aria-orientation={orientation}
      className={cn(
        'bg-border/80',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        'dark:bg-border/60',
        className,
      )}
      {...props}
    />
  ),
);

Separator.displayName = 'Separator';

export { Separator };
