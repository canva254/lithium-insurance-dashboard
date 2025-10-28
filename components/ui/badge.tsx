import type { HTMLAttributes } from 'react';

type Variant = 'default' | 'outline' | 'secondary' | 'destructive';

const variantStyles: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground',
  outline: 'border border-border text-foreground',
  secondary: 'bg-muted text-muted-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ children, className = '', variant = 'default', ...props }: BadgeProps) {
  const classes = `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`.trim();
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

export default Badge;
