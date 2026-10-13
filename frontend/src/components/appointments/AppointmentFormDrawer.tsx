import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import {
  Check,
  Clock,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  Stethoscope,
  X,
} from "lucide-react";

import {
  createAppointment,
  getDoctors,
  updateAppointment,
} from "@/lib/api";
import type { AppointmentInput } from "@/lib/api";
import type { Appointment } from "@/types/appointment";

import { AddDoctorModal } from "@/components/doctors/AddDoctorModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppointmentFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onAppointmentCreated?: (created: Appointment) => void;
}

const APPOINTMENT_TYPES = [
  { value: 0, label: "Consultation" },
  { value: 1, label: "Follow-up" },
  { value: 2, label: "Checkup" },
  { value: 3, label: "Emergency" },
] as const;

const APPOINTMENT_STATUSES = [
  {
    value: 0,
    label: "Scheduled",
    activeClass:
      "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500 font-semibold",
  },
  {
    value: 1,
    label: "Completed",
    activeClass:
      "border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 font-semibold",
  },
  {
    value: 2,
    label: "Cancelled",
    activeClass:
      "border-rose-600 bg-rose-50 text-rose-700 ring-1 ring-rose-500 font-semibold",
  },
] as const;

const QUICK_TIME_SLOTS = [
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "16:00",
  "17:00",
];

function parseTypeToNumber(type?: string | number): number {
  if (type === undefined || type === null) return 0;
  if (typeof type === "number") return type;
  const num = Number(type);
  if (!isNaN(num)) return num;
  if (type.toLowerCase() === "followup" || type.toLowerCase() === "follow-up")
    return 1;
  if (type.toLowerCase() === "checkup") return 2;
  if (type.toLowerCase() === "emergency") return 3;
  return 0;
}

function parseStatusToNumber(status?: string | number): number {
  if (status === undefined || status === null) return 0;
  if (typeof status === "number") return status;
  const num = Number(status);
  if (!isNaN(num)) return num;
  if (status.toLowerCase() === "completed") return 1;
  if (status.toLowerCase() === "cancelled") return 2;
  return 0;
}

function extractDateAndTimeString(value?: string) {
  if (!value) {
    const today = new Date();
    return {
      dateStr: format(today, "yyyy-MM-dd"),
      timeStr: "09:00",
    };
  }

  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    dateStr: `${part("year")}-${part("month")}-${part("day")}`,
    timeStr: `${part("hour")}:${part("minute")}`,
  };
}

function combineToIso(dateStr: string, timeStr: string) {
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${normalizedTime}+05:30`).toISOString();
}

function formatSlotDisplay(slot: string) {
  const [h, m] = slot.split(":");
  const hourNum = parseInt(h, 10);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const displayHour = hourNum % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

interface AppointmentFormContentProps {
  appointment?: Appointment | null;
  onClose: () => void;
  onAppointmentCreated?: (created: Appointment) => void;
}

function AppointmentFormContent({
  appointment,
  onClose,
  onAppointmentCreated,
}: AppointmentFormContentProps) {
  const isEditing = Boolean(appointment);
  const queryClient = useQueryClient();

  const initialDateTime = useMemo(
    () => extractDateAndTimeString(appointment?.appointmentDateTime),
    [appointment?.appointmentDateTime],
  );

  const [patientName, setPatientName] = useState(
    () => appointment?.patientName ?? "",
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(
    () => appointment?.doctorId ?? null,
  );
  const [doctorSearch, setDoctorSearch] = useState("");
  const [dateStr, setDateStr] = useState(initialDateTime.dateStr);
  const [timeStr, setTimeStr] = useState(initialDateTime.timeStr);
  const [selectedType, setSelectedType] = useState<number>(() =>
    parseTypeToNumber(appointment?.type),
  );
  const [selectedStatus, setSelectedStatus] = useState<number>(() =>
    parseStatusToNumber(appointment?.status),
  );
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const patientNameInputRef = useRef<HTMLInputElement>(null);
  const doctorSearchInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const doctorsQuery = useQuery({
    queryKey: ["doctors"],
    queryFn: getDoctors,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      patientNameInputRef.current?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  const filteredDoctors = useMemo(() => {
    const list = doctorsQuery.data ?? [];
    const term = doctorSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        (d.specialization && d.specialization.toLowerCase().includes(term)),
    );
  }, [doctorsQuery.data, doctorSearch]);

  const selectedDoctor = useMemo(() => {
    if (selectedDoctorId === null) return null;
    return doctorsQuery.data?.find((d) => d.id === selectedDoctorId) ?? null;
  }, [doctorsQuery.data, selectedDoctorId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!patientName.trim()) {
        throw new Error("Patient name is required.");
      }
      if (selectedDoctorId === null) {
        throw new Error("Please select a doctor.");
      }
      if (!dateStr || !timeStr) {
        throw new Error("Please select an appointment date and time.");
      }

      const payload: AppointmentInput = {
        patientName: patientName.trim(),
        appointmentDateTime: combineToIso(dateStr, timeStr),
        doctorId: selectedDoctorId,
        type: selectedType,
        status: selectedStatus,
      };

      if (appointment) {
        return updateAppointment(appointment.id, payload);
      }
      return createAppointment(payload);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
      onClose();
      if (!isEditing && result && onAppointmentCreated) {
        onAppointmentCreated(result);
      }
    },
    onError: (err: Error) => {
      setValidationError(err.message || "Failed to save appointment.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!patientName.trim()) {
      setValidationError("Patient name is required.");
      patientNameInputRef.current?.focus();
      return;
    }
    if (selectedDoctorId === null) {
      setValidationError("Please select a doctor.");
      doctorSearchInputRef.current?.focus();
      return;
    }
    if (!dateStr || !timeStr) {
      setValidationError("Please specify both date and time.");
      dateInputRef.current?.focus();
      return;
    }

    mutation.mutate();
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      const target = e.target as HTMLElement;

      if (
        target.tagName === "BUTTON" &&
        (target as HTMLButtonElement).type === "submit"
      ) {
        return;
      }

      e.preventDefault();

      if (target.id === "patientName") {
        if (selectedDoctorId === null) {
          doctorSearchInputRef.current?.focus();
        } else {
          dateInputRef.current?.focus();
        }
      } else if (target.id === "doctorSearch") {
        if (filteredDoctors.length > 0 && selectedDoctorId === null) {
          setSelectedDoctorId(filteredDoctors[0].id);
        }
        dateInputRef.current?.focus();
      } else if (target.id === "appointmentDate") {
        timeInputRef.current?.focus();
      } else if (target.id === "appointmentTime") {
        submitButtonRef.current?.focus();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => !mutation.isPending && onClose()}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-teal-800">
                  RECEPTION
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {isEditing ? "Edit Appointment" : "New Appointment"}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEditing
                  ? "Update patient booking details below."
                  : "Enter patient, doctor, and schedule details."}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-slate-400 hover:text-slate-700"
              onClick={onClose}
              disabled={mutation.isPending}
              aria-label="Close drawer"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Drawer Form Body */}
          <form
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {validationError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {validationError}
                </div>
              )}

              {/* 1. Patient Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="patientName"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="patientName"
                  ref={patientNameInputRef}
                  placeholder="e.g. Kamal Perera"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="h-11 text-base font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Press Enter to move to Doctor search.
                </p>
              </div>

              {/* 2. Doctor Selector with Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="doctorSearch"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setDoctorModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    <Plus className="size-3.5" />
                    Add new doctor
                  </button>
                </div>

                {selectedDoctor ? (
                  <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/70 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-teal-700 text-white">
                        <Stethoscope className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedDoctor.name}
                        </p>
                        <p className="text-xs text-teal-800">
                          {selectedDoctor.specialization || "General Medicine"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDoctorId(null);
                        setDoctorSearch("");
                        setTimeout(
                          () => doctorSearchInputRef.current?.focus(),
                          50,
                        );
                      }}
                      className="h-8 gap-1.5 text-xs text-slate-600"
                    >
                      <RotateCcw className="size-3" />
                      Change doctor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="doctorSearch"
                        ref={doctorSearchInputRef}
                        placeholder="Search doctor by name or specialty..."
                        value={doctorSearch}
                        onChange={(e) => setDoctorSearch(e.target.value)}
                        className="h-10 pl-9 text-sm"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
                      {doctorsQuery.isLoading && (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          Loading doctors...
                        </div>
                      )}
                      {!doctorsQuery.isLoading &&
                        filteredDoctors.length === 0 && (
                          <div className="p-3 text-center text-xs text-muted-foreground space-y-1.5">
                            <p>No doctors found matching "{doctorSearch}".</p>
                            <button
                              type="button"
                              onClick={() => setDoctorModalOpen(true)}
                              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                            >
                              <Plus className="size-3" />
                              Add new doctor
                            </button>
                          </div>
                        )}
                      {filteredDoctors.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            dateInputRef.current?.focus();
                          }}
                          className="flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-teal-50/60"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-900">
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {doc.specialization || "General Medicine"}
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-teal-700">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Date & Time Selection (Bigger & Convenient) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Date & Time (Sri Lanka) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDateStr(format(new Date(), "yyyy-MM-dd"))
                      }
                      className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Today
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDateStr(format(addDays(new Date(), 1), "yyyy-MM-dd"))
                      }
                      className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Tomorrow
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="appointmentDate"
                      className="text-xs text-muted-foreground"
                    >
                      Appointment Date
                    </label>
                    <Input
                      id="appointmentDate"
                      ref={dateInputRef}
                      type="date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="mt-1 h-11 text-sm font-semibold bg-slate-50/60 border-slate-300 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="appointmentTime"
                      className="text-xs text-muted-foreground"
                    >
                      Appointment Time
                    </label>
                    <Input
                      id="appointmentTime"
                      ref={timeInputRef}
                      type="time"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className="mt-1 h-11 text-sm font-semibold bg-slate-50/60 border-slate-300 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Convenient Time Slots */}
                <div>
                  <p className="mb-1.5 text-[11px] text-muted-foreground">
                    Quick time slots:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TIME_SLOTS.map((slot) => {
                      const isSelected = timeStr === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTimeStr(slot)}
                          className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                            isSelected
                              ? "border-teal-700 bg-teal-700 text-white font-semibold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {formatSlotDisplay(slot)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Formatted Date & Time readout */}
                {dateStr && timeStr && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <Clock className="size-4 text-teal-700 shrink-0" />
                    <span>
                      Scheduled for{" "}
                      <strong className="text-slate-900">
                        {format(
                          new Date(`${dateStr}T12:00:00`),
                          "EEEE, MMMM d, yyyy",
                        )}
                      </strong>{" "}
                      at{" "}
                      <strong className="text-teal-800">
                        {formatSlotDisplay(timeStr)}
                      </strong>{" "}
                      (Asia/Colombo)
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Appointment Type Toggle Group */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Appointment Type
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {APPOINTMENT_TYPES.map((t) => {
                    const isSelected = selectedType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setSelectedType(t.value)}
                        className={`flex h-11 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-all select-none ${
                          isSelected
                            ? t.value === 3
                              ? "border-red-600 bg-red-50 text-red-700 ring-1 ring-red-500 font-semibold"
                              : "border-teal-700 bg-teal-50 text-teal-800 ring-1 ring-teal-600 font-semibold shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="mr-1.5 size-3.5" />}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Status Toggle Group */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {APPOINTMENT_STATUSES.map((s) => {
                    const isSelected = selectedStatus === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSelectedStatus(s.value)}
                        className={`flex h-11 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-all select-none ${
                          isSelected
                            ? s.activeClass
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="mr-1.5 size-3.5" />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                ref={submitButtonRef}
                type="submit"
                disabled={mutation.isPending}
                className="bg-teal-700 text-white hover:bg-teal-800 min-w-32 gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Update appointment"
                ) : (
                  "Create appointment"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Add Doctor Modal */}
      <AddDoctorModal
        open={doctorModalOpen}
        onOpenChange={setDoctorModalOpen}
        onDoctorCreated={(created) => {
          setSelectedDoctorId(created.id);
          setDoctorSearch("");
          setTimeout(() => dateInputRef.current?.focus(), 50);
        }}
      />
    </div>
  );
}

export function AppointmentFormDrawer({
  open,
  onOpenChange,
  appointment,
  onAppointmentCreated,
}: AppointmentFormDrawerProps) {
  if (!open) return null;

  return (
    <AppointmentFormContent
      key={appointment ? appointment.id : "new"}
      appointment={appointment}
      onClose={() => onOpenChange(false)}
      onAppointmentCreated={onAppointmentCreated}
    />
  );
}
