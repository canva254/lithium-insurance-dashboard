type ToastVariant = 'default' | 'destructive';

export type Toast = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastHandler = (toast: Toast) => void;

let listeners: ToastHandler[] = [];

export function useToast() {
  return {
    toast: (toast: Toast) => {
      listeners.forEach((listener) => listener(toast));
    },
    subscribe: (listener: ToastHandler) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((item) => item !== listener);
      };
    },
  };
}
