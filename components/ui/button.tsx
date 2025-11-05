import { forwardRef, isValidElement, cloneElement } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = 'default', size = 'default', className = '', type = 'button', asChild = false, ...props },
  ref,
) {
  const variantClasses: Record<ButtonVariant, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border bg-background hover:bg-muted',
    ghost: 'hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    secondary: 'bg-muted text-muted-foreground hover:bg-muted/80',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3',
    lg: 'h-11 px-5',
    icon: 'h-9 w-9',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

  if (asChild && isValidElement(children)) {
    // Merge classes into the child element and pass through props (excluding type)
    const child: any = children;
    const mergedClassName = `${classes} ${child.props?.className ?? ''}`.trim();
    return cloneElement(child, { className: mergedClassName, ...props });
  }

  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
