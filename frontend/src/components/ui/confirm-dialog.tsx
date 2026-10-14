import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDestructive = variant === "destructive";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={() => !isLoading && onCancel()}
        aria-hidden="true"
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 z-10 animate-in zoom-in-95 fade-in-0 duration-200">
        <div className="flex items-start justify-between pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                isDestructive
                  ? "bg-rose-100 text-rose-700"
                  : "bg-teal-100 text-teal-800"
              }`}
            >
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Action confirmation required
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-slate-400 hover:text-slate-700 -mr-1 -mt-1"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="my-3 text-xs leading-relaxed text-slate-600 bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
          {message}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="h-9 px-4 text-xs"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-9 px-4 text-xs gap-1.5 text-white ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 shadow-xs"
                : "bg-teal-700 hover:bg-teal-800 shadow-xs"
            }`}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
