import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hash,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import {
  deleteAppointment,
  getAppointments,
  getDoctors,
} from "@/lib/api";
import type {
  Appointment,
  AppointmentFilters,
} from "@/types/appointment";

import { AppointmentFormDrawer } from "@/components/appointments/AppointmentFormDrawer";
import { CalendarFilter } from "@/components/appointments/CalendarFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddDoctorModal } from "./components/doctors/AddDoctorModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/context/ToastContext";

const initialFilters: AppointmentFilters = {
  page: 1,
  pageSize: 10,
  search: "",
  status: "",
  type: "",
  doctorId: "",
  sortBy: "date",
  sortOrder: "asc",
  selectedDate: null,
  from: undefined,
  to: undefined,
};

const TYPE_LABELS: Record<string, string> = {
  "0": "Consultation",
  "1": "Follow-up",
  "2": "Checkup",
  "3": "Emergency",
  Consultation: "Consultation",
  FollowUp: "Follow-up",
  "Follow-up": "Follow-up",
  Checkup: "Checkup",
  Emergency: "Emergency",
};

function formatAppointmentType(type: unknown): string {
  if (type === undefined || type === null) return "Consultation";
  const key = String(type);
  return TYPE_LABELS[key] || key;
}

const STATUS_LABELS: Record<string, "Scheduled" | "Completed" | "Cancelled"> = {
  "0": "Scheduled",
  "1": "Completed",
  "2": "Cancelled",
  Scheduled: "Scheduled",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

function formatAppointmentStatus(
  status: unknown,
): "Scheduled" | "Completed" | "Cancelled" {
  if (status === undefined || status === null) return "Scheduled";
  const key = String(status);
  return STATUS_LABELS[key] || "Scheduled";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: Appointment["status"] }) {
  const label = formatAppointmentStatus(status);

  const styles: Record<string, string> = {
    Scheduled: "border-blue-200 bg-blue-50 text-blue-700",
    Completed: "border-green-200 bg-green-50 text-green-700",
    Cancelled: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <Badge variant="outline" className={styles[label] ?? ""}>
      {label}
    </Badge>
  );
}

export default function App() {
  const [filters, setFilters] = useState<AppointmentFilters>(initialFilters);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const queryClient = useQueryClient();

  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<Appointment | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
      const name = appointmentToDelete?.patientName || "Patient";
      toast.success(
        `Appointment for ${name} has been cancelled and removed.`,
        "Appointment Deleted",
      );
      setAppointmentToDelete(null);
    },
    onError: (err: Error) => {
      toast.error(
        err.message || "Failed to delete appointment.",
        "Deletion Error",
      );
      setAppointmentToDelete(null);
    },
  });

  function openCreateDialog() {
    setSelectedAppointment(null);
    setFormOpen(true);
  }

  function openEditDialog(appointment: Appointment) {
    setSelectedAppointment(appointment);
    setFormOpen(true);
  }

  function handleDelete(appointment: Appointment) {
    setAppointmentToDelete(appointment);
  }

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", filters],
    queryFn: ({ signal }) => getAppointments(filters, signal),
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors"],
    queryFn: getDoctors,
  });

  const data = appointmentsQuery.data;
  const appointments = data?.items ?? [];

  function updateFilter<K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
    }));
  }

  function handleDateSelect(date: Date | null) {
    setSelectedDate(date);

    if (!date) {
      setFilters((current) => ({
        ...current,
        page: 1,
        selectedDate: null,
        from: undefined,
        to: undefined,
      }));
      return;
    }

    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );

    setFilters((current) => ({
      ...current,
      page: 1,
      selectedDate: format(date, "yyyy-MM-dd"),
      from: startOfDay.toISOString(),
      to: endOfDay.toISOString(),
    }));
  }

  function handleReset() {
    setSelectedDate(null);
    setFilters(initialFilters);
    toast.info("All search and filter criteria have been reset.", "Filters Reset");
  }

  function toggleSort(sortBy: string) {
    setFilters((current) => ({
      ...current,
      page: 1,
      sortBy,
      sortOrder:
        current.sortBy === sortBy && current.sortOrder === "asc"
          ? "desc"
          : "asc",
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Application Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-700 p-2 text-white shadow-xs">
            <Stethoscope className="size-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-slate-900">
              ClinicDesk
            </span>
            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-teal-800">
              RECEPTION
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Title & Actions */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Appointments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage patient bookings, browse daily schedules, and filter by date.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setDoctorModalOpen(true)}
              className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Stethoscope className="size-4 text-teal-700" />
              Add doctor
            </Button>
            <Button
              onClick={openCreateDialog}
              className="gap-2 bg-teal-700 hover:bg-teal-800"
            >
              <Plus className="size-4" />
              New appointment
            </Button>
          </div>
        </div>

        {/* Calendar and Appointments Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Calendar Filter Column */}
          <div className="lg:col-span-4 xl:col-span-4">
            <CalendarFilter
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
            />
          </div>

          {/* Appointments Table Column */}
          <div className="space-y-4 lg:col-span-8 xl:col-span-8 pt-1">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="space-y-4">
                {/* Search & Reset */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9 h-10"
                      placeholder="Search patient or doctor..."
                      value={filters.search}
                      onChange={(event) =>
                        updateFilter("search", event.target.value)
                      }
                    />
                  </div>

                  {(filters.search ||
                    filters.status ||
                    filters.type ||
                    selectedDate) && (
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="h-10 gap-2 text-xs"
                      >
                        <XCircle className="size-4" />
                        Reset filters
                      </Button>
                    )}
                </div>

                {/* Filter Toggles: Status & Type */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
                  {/* Status Toggle Group */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
                      Status:
                    </span>
                    {[
                      { label: "All", value: "", activeClass: "border-teal-700 bg-teal-700 text-white font-semibold shadow-xs" },
                      {
                        label: "Scheduled",
                        value: "Scheduled",
                        activeClass:
                          "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 font-semibold",
                      },
                      {
                        label: "Completed",
                        value: "Completed",
                        activeClass:
                          "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 font-semibold",
                      },
                      {
                        label: "Cancelled",
                        value: "Cancelled",
                        activeClass:
                          "border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500 font-semibold",
                      },
                    ].map((item) => {
                      const isSelected = (filters.status || "") === item.value;
                      return (
                        <button
                          key={item.value || "all-status"}
                          type="button"
                          onClick={() => updateFilter("status", item.value)}
                          className={`h-7 rounded-md px-2.5 text-xs font-medium transition-all border select-none ${isSelected
                            ? item.activeClass
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Type Toggle Group */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
                      Type:
                    </span>
                    {[
                      { label: "All", value: "", activeClass: "border-teal-700 bg-teal-700 text-white font-semibold shadow-xs" },
                      {
                        label: "Consultation",
                        value: "Consultation",
                        activeClass:
                          "border-teal-700 bg-teal-50 text-teal-800 ring-1 ring-teal-600 font-semibold",
                      },
                      {
                        label: "Follow-up",
                        value: "FollowUp",
                        activeClass:
                          "border-teal-700 bg-teal-50 text-teal-800 ring-1 ring-teal-600 font-semibold",
                      },
                      {
                        label: "Checkup",
                        value: "Checkup",
                        activeClass:
                          "border-teal-700 bg-teal-50 text-teal-800 ring-1 ring-teal-600 font-semibold",
                      },
                      {
                        label: "Emergency",
                        value: "Emergency",
                        activeClass:
                          "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500 font-semibold",
                      },
                    ].map((item) => {
                      const isSelected = (filters.type || "") === item.value;
                      return (
                        <button
                          key={item.value || "all-type"}
                          type="button"
                          onClick={() => updateFilter("type", item.value)}
                          className={`h-7 rounded-md px-2.5 text-xs font-medium transition-all border select-none ${isSelected
                            ? item.activeClass
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filter Status Badge */}
                {selectedDate && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="text-xs text-muted-foreground">
                      Active date filter:
                    </span>
                    <Badge
                      variant="secondary"
                      className="gap-1.5 border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-normal text-teal-800"
                    >
                      <CalendarDays className="size-3 text-teal-700" />
                      <span>{format(selectedDate, "EEE, MMM d, yyyy")}</span>
                      <button
                        type="button"
                        onClick={() => handleDateSelect(null)}
                        className="ml-1 rounded-full p-0.5 hover:bg-teal-200"
                        aria-label="Clear date filter"
                      >
                        <X className="size-3 text-teal-700" />
                      </button>
                    </Badge>
                  </div>
                )}

                {/* Query Error Notice */}
                {appointmentsQuery.isError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-medium">Couldn't load appointments.</p>
                    <p className="mt-1">
                      {appointmentsQuery.error.message}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => appointmentsQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-center">
                          <span className="inline-flex items-center gap-1">
                            <Hash className="size-3 text-teal-700" />
                          </span>
                        </TableHead>
                        <TableHead>
                          <button
                            className="inline-flex items-center gap-1 hover:text-slate-900"
                            onClick={() => toggleSort("patient")}
                          >
                            Patient <ChevronDown className="size-3" />
                          </button>
                        </TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>
                          <button
                            className="inline-flex items-center gap-1 hover:text-slate-900"
                            onClick={() => toggleSort("date")}
                          >
                            Date & time <ChevronDown className="size-3" />
                          </button>
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {appointmentsQuery.isLoading &&
                        Array.from({ length: 4 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={7} className="h-14">
                              <div className="h-4 animate-pulse rounded bg-slate-100" />
                            </TableCell>
                          </TableRow>
                        ))}

                      {!appointmentsQuery.isLoading &&
                        !appointmentsQuery.isError &&
                        appointments.map((appointment) => {
                          const slotNum = appointment.slotNumber ?? 1;

                          return (
                            <TableRow key={appointment.id}>
                              <TableCell className="text-center">
                                <span
                                  className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                                  title={`Appointment #${slotNum}`}
                                >
                                  #{slotNum}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">
                                {appointment.patientName}
                              </TableCell>
                              <TableCell>
                                <div>
                                  {appointment.doctorName &&
                                    isNaN(Number(appointment.doctorName))
                                    ? appointment.doctorName
                                    : doctorsQuery.data?.find(
                                      (d) => d.id === appointment.doctorId,
                                    )?.name || `Dr. Assigned`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {appointment.doctorSpecialization ??
                                    doctorsQuery.data?.find(
                                      (d) => d.id === appointment.doctorId,
                                    )?.specialization ??
                                    "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {dateLabel(appointment.appointmentDateTime)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                  {formatAppointmentType(appointment.type)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={appointment.status} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Edit ${appointment.patientName}`}
                                    onClick={() => openEditDialog(appointment)}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Delete ${appointment.patientName}`}
                                    disabled={deleteMutation.isPending}
                                    onClick={() => handleDelete(appointment)}
                                  >
                                    <Trash2 className="size-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}

                      {!appointmentsQuery.isLoading &&
                        !appointmentsQuery.isError &&
                        appointments.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-32 text-center text-muted-foreground"
                            >
                              {selectedDate ? (
                                <div>
                                  <p className="font-medium text-slate-700">
                                    No appointments scheduled for{" "}
                                    {format(selectedDate, "MMMM d, yyyy")}.
                                  </p>
                                  <p className="mt-1 text-xs">
                                    Try selecting another date or{" "}
                                    <button
                                      type="button"
                                      onClick={() => handleDateSelect(null)}
                                      className="font-medium text-teal-700 underline hover:text-teal-800"
                                    >
                                      view all dates
                                    </button>
                                    .
                                  </p>
                                </div>
                              ) : (
                                "No appointments found. Try changing your filters."
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-xs text-muted-foreground">
                    Page {data?.page ?? filters.page} of {data?.totalPages ?? 0}
                    {" · "}
                    {data?.totalCount ?? 0} total
                  </p>

                  <div className="flex items-center gap-2">
                    <Select
                      value={String(filters.pageSize)}
                      onValueChange={(value) =>
                        updateFilter("pageSize", Number(value) || 10)
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Previous page"
                      disabled={!data || filters.page <= 1}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page - 1,
                        }))
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Next page"
                      disabled={!data || filters.page >= data.totalPages}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page + 1,
                        }))
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Create / Edit Appointment Drawer */}
      <AppointmentFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={selectedAppointment}
      />

      {/* Add Doctor Modal */}
      <AddDoctorModal
        open={doctorModalOpen}
        onOpenChange={setDoctorModalOpen}
      />

      {/* Modern Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(appointmentToDelete)}
        title="Delete Appointment"
        message={`Are you sure you want to permanently delete the booking for ${appointmentToDelete?.patientName}? This action cannot be undone.`}
        confirmText="Delete Booking"
        cancelText="Keep Booking"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (appointmentToDelete) {
            deleteMutation.mutate(appointmentToDelete.id);
          }
        }}
        onCancel={() => setAppointmentToDelete(null)}
      />
    </div>
  );
}