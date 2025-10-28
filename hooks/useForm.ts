import { useCallback, useState } from 'react';

import type { ValidationError } from '@/types/api';

type FormErrors<T> = {
  [K in keyof T]?: string[];
};

type FormTouched<T> = {
  [K in keyof T]?: boolean;
};

export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validate?: (values: T) => Record<keyof T, string[]>,
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = event.target;

      let finalValue: any = value;
      if (type === 'number') {
        finalValue = value === '' ? '' : Number(value);
      } else if (type === 'checkbox') {
        finalValue = (event.target as HTMLInputElement).checked;
      }

      setValues((prev) => ({
        ...prev,
        [name]: finalValue,
      }));

      if (errors[name as keyof T]) {
        setErrors((prev) => ({
          ...prev,
          [name]: undefined,
        }));
      }
    },
    [errors],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = event.target;

      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      if (validate) {
        const validationErrors = validate(values);
        if (validationErrors[name as keyof T]?.length) {
          setErrors((prev) => ({
            ...prev,
            [name]: validationErrors[name as keyof T],
          }));
        }
      }
    },
    [validate, values],
  );

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const setFieldTouched = useCallback((name: keyof T, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  const setFieldError = useCallback((name: keyof T, error: string[] | undefined) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  const setErrorsFromApi = useCallback((apiErrors: ValidationError[]) => {
    const formattedErrors = apiErrors.reduce<FormErrors<T>>((acc, error) => {
      const field = error.field as keyof T;
      if (!acc[field]) {
        acc[field] = [];
      }
      (acc[field] as string[]).push(error.message);
      return acc;
    }, {});

    setErrors(formattedErrors);
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
  }, [initialValues]);

  const validateForm = useCallback((): boolean => {
    if (!validate) return true;

    const validationErrors = validate(values);
    const hasErrors = Object.values(validationErrors).some((value) => value.length > 0);

    if (hasErrors) {
      const newErrors = Object.entries(validationErrors).reduce<FormErrors<T>>((acc, [key, value]) => {
        if (value.length > 0) {
          acc[key as keyof T] = value;
        }
        return acc;
      }, {});

      setErrors(newErrors);
      return false;
    }

    return true;
  }, [validate, values]);

  const getFieldProps = (name: keyof T) => ({
    name,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    error: !!(touched[name] && errors[name]?.length),
    helperText: touched[name] ? errors[name]?.[0] : '',
  });

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    setValues,
    setErrors,
    setTouched,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    setErrorsFromApi,
    setSubmitError,
    handleChange,
    handleBlur,
    resetForm,
    validate: validateForm,
    getFieldProps,
    setIsSubmitting,
  };
};

export default useForm;
