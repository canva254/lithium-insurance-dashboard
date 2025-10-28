import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function Button(
  { children, ...props },
  ref,
) {
  return (
    <button ref={ref} type="button" {...props}>
      {children}
    </button>
  );
});

Button.displayName = 'Button';
