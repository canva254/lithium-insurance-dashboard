import * as React from 'react';
import type { FieldValues, ControllerProps, FieldError } from 'react-hook-form';
import { Controller, FormProvider, useFormContext } from 'react-hook-form';

import { cn } from '@/lib/utils';

export const Form = FormProvider;

type FormFieldContextValue = {
  name: string;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({ name: '' });

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const form = useFormContext();

  const fieldState = form.getFieldState(fieldContext.name, form.formState);
  const id = itemContext?.id;

  return {
    id,
    name: fieldContext.name,
    formItemId: id,
    formDescriptionId: itemContext?.descriptionId,
    formMessageId: itemContext?.messageId,
    ...fieldState,
  };
};

const FormField = <TFieldValues extends FieldValues, TName extends string = string>(
  props: ControllerProps<TFieldValues, TName>,
) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

type FormItemContextValue = {
  id: string;
  descriptionId: string;
  messageId: string;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const id = React.useId();
  const value = React.useMemo(
    () => ({
      id,
      descriptionId: `${id}-description`,
      messageId: `${id}-message`,
    }),
    [id],
  );

  return (
    <FormItemContext.Provider value={value}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    const { formItemId } = useFormField();
    return <label ref={ref} className={cn('text-sm font-medium leading-none', className)} htmlFor={formItemId} {...props} />;
  },
);
FormLabel.displayName = 'FormLabel';

const FormControl = ({ children }: { children: React.ReactElement }) => {
  const { formItemId, formDescriptionId, formMessageId, error } = useFormField();

  return React.cloneElement(children, {
    id: formItemId,
    'aria-describedby': [formDescriptionId, formMessageId].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
  });
};

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();
    return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} id={formDescriptionId} {...props} />;
  },
);
FormDescription.displayName = 'FormDescription';

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { formMessageId, error } = useFormField();
    const body = error ? (error as FieldError).message : children;

    if (!body) {
      return null;
    }

    return (
      <p ref={ref} className={cn('text-sm font-medium text-destructive', className)} id={formMessageId} {...props}>
        {body as React.ReactNode}
      </p>
    );
  },
);
FormMessage.displayName = 'FormMessage';

export { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
