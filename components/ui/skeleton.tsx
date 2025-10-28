import type { HTMLAttributes } from 'react';

export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const classes = `animate-pulse rounded-md bg-muted ${className}`.trim();
  return <div className={classes} {...props} />;
}

export default Skeleton;
