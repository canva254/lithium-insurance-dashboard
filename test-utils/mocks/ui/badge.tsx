import type { HTMLAttributes } from 'react';

export function Badge({ children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span role="presentation" {...props}>
      {children}
    </span>
  );
}
