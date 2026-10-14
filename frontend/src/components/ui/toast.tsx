import { useCallback, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

import {
  ToastContext,
  useToast,
  type ToastItem,
} from "@/context/ToastContext";

function ToastNotification({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const config = {
    success: {
      icon: CheckCircle2,
      containerClass:
        "border-emerald-200 bg-white text-slate-800 shadow-xl shadow-emerald-950/5",
      iconClass: "text-emerald-600 bg-emerald-50",
      defaultTitle: "Success",
    },
    error: {
      icon: AlertCircle,
      containerClass:
        "border-rose-200 bg-white text-slate-800 shadow-xl shadow-rose-950/5",
      iconClass: "text-rose-600 bg-rose-50",
      defaultTitle: "Error",
    },
    info: {
      icon: Info,
      containerClass:
        "border-teal-200 bg-white text-slate-800 shadow-xl shadow-teal-950/5",
      iconClass: "text-teal-700 bg-teal-50",
      defaultTitle: "Update",
    },
    warning: {
      icon: AlertTriangle,
      containerClass:
        "border-amber-200 bg-white text-slate-800 shadow-xl shadow-amber-950/5",
      iconClass: "text-amber-600 bg-amber-50",
      defaultTitle: "Notice",
    },
  }[toast.type];

  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-3.5 shadow-lg transition-all animate-in slide-in-from-bottom-5 duration-300 ${config.containerClass}`}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${config.iconClass}`}
      >
        <IconComponent className="size-4" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold tracking-tight text-slate-900">
            {toast.title || config.defaultTitle}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 -mr-1 -mt-1 rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function ToastViewport() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 p-2 pointer-events-none"
    >
      {toasts.map((item) => (
        <ToastNotification
          key={item.id}
          toast={item}
          onDismiss={() => removeToast(item.id)}
        />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, message, title, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast],
  );

  const toastHelpers = {
    success: useCallback(
      (message: string, title?: string, duration?: number) =>
        addToast({ type: "success", message, title, duration }),
      [addToast],
    ),
    error: useCallback(
      (message: string, title?: string, duration?: number) =>
        addToast({ type: "error", message, title, duration }),
      [addToast],
    ),
    info: useCallback(
      (message: string, title?: string, duration?: number) =>
        addToast({ type: "info", message, title, duration }),
      [addToast],
    ),
    warning: useCallback(
      (message: string, title?: string, duration?: number) =>
        addToast({ type: "warning", message, title, duration }),
      [addToast],
    ),
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        toast: toastHelpers,
      }}
    >
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}
