import type { HTMLAttributes } from 'react';

export function Skeleton({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {children}
    </div>
  );
}
