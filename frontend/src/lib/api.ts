import type {
  Appointment,
  AppointmentFilters,
  Doctor,
  PagedResponse,
} from "@/types/appointment";

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Request failed (${response.status})`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getAppointments(
  filters: AppointmentFilters,
  signal?: AbortSignal,
): Promise<PagedResponse<Appointment>> {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.doctorId) params.set("doctorId", filters.doctorId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  return request<PagedResponse<Appointment>>(
    `/api/appointments?${params.toString()}`,
    { signal },
  );
}

export function getDoctors(): Promise<Doctor[]> {
  return request<Doctor[]>("/api/doctors");
}

export interface DoctorInput {
  name: string;
  specialization?: string | null;
}

export function createDoctor(input: DoctorInput): Promise<Doctor> {
  return request<Doctor>("/api/doctors", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

import type {
  AppointmentType,
  AppointmentStatus,
} from "@/types/appointment";

export interface AppointmentInput {
  patientName: string;
  appointmentDateTime: string;
  doctorId: number;
  type: AppointmentType;
  status: AppointmentStatus;
}

export function createAppointment(
  input: AppointmentInput,
): Promise<Appointment> {
  return request<Appointment>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAppointment(
  id: number,
  input: AppointmentInput,
): Promise<Appointment> {
  return request<Appointment>(`/api/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAppointment(id: number): Promise<void> {
  return request<void>(`/api/appointments/${id}`, {
    method: "DELETE",
  });
}