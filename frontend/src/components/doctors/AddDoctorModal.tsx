import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus, Stethoscope, X } from "lucide-react";

import { createDoctor } from "@/lib/api";
import type { Doctor } from "@/types/appointment";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddDoctorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDoctorCreated?: (doctor: Doctor) => void;
}

const COMMON_SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Orthopedics",
  "Neurology",
  "ENT",
  "Gynecology",
  "Psychiatry",
  "Ophthalmology",
];

interface AddDoctorDialogContentProps {
  onClose: () => void;
  onDoctorCreated?: (doctor: Doctor) => void;
}

function AddDoctorDialogContent({
  onClose,
  onDoctorCreated,
}: AddDoctorDialogContentProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const specializationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Doctor name is required.");
      }

      return createDoctor({
        name: trimmedName,
        specialization: specialization.trim() || null,
      });
    },
    onSuccess: async (createdDoctor) => {
      await queryClient.invalidateQueries({
        queryKey: ["doctors"],
      });
      onClose();
      toast.success(
        `${createdDoctor.name} added to the staff roster.`,
        "Doctor Added",
      );
      onDoctorCreated?.(createdDoctor);
    },
    onError: (err: Error) => {
      const msg = err.message || "Failed to create doctor.";
      setError(msg);
      toast.error(msg, "Doctor Creation Failed");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Doctor name is required.");
      nameInputRef.current?.focus();
      return;
    }

    mutation.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" &&
        (target as HTMLButtonElement).type === "submit"
      ) {
        return;
      }

      if (target.id === "doctorName") {
        e.preventDefault();
        specializationInputRef.current?.focus();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={() => !mutation.isPending && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 z-10 animate-in zoom-in-95 fade-in-0 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-xs">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Add New Doctor
                </h3>
                <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 tracking-wider">
                  STAFF
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Register a new physician to the clinic roster.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-slate-400 hover:text-slate-700 -mr-1 -mt-1"
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Doctor Name Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="doctorName"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Doctor Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="doctorName"
              ref={nameInputRef}
              placeholder="e.g. Dr. Kasun Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm font-medium"
            />
            <p className="text-[11px] text-muted-foreground">
              Include title (e.g. Dr.) and full name.
            </p>
          </div>

          {/* Specialization Field */}
          <div className="space-y-2">
            <label
              htmlFor="doctorSpecialization"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Specialization
            </label>
            <Input
              id="doctorSpecialization"
              ref={specializationInputRef}
              placeholder="e.g. Cardiology, General Medicine"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="h-10 text-sm"
            />

            {/* Quick chips */}
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Common specialties:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SPECIALIZATIONS.map((spec) => {
                  const isSelected =
                    specialization.trim().toLowerCase() === spec.toLowerCase();
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setSpecialization(spec)}
                      className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                        isSelected
                          ? "border-teal-700 bg-teal-700 text-white font-medium"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {spec}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-9 px-4 text-xs bg-teal-700 hover:bg-teal-800 text-white gap-1.5"
            >
              {mutation.isPending ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Add Doctor
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddDoctorModal({
  open,
  onOpenChange,
  onDoctorCreated,
}: AddDoctorModalProps) {
  if (!open) return null;

  return (
    <AddDoctorDialogContent
      onClose={() => onOpenChange(false)}
      onDoctorCreated={onDoctorCreated}
    />
  );
}
