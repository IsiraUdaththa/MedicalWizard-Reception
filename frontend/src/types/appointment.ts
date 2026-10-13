export type AppointmentStatus =
  | "Scheduled"
  | "Completed"
  | "Cancelled"
  | number;


export type AppointmentType = string | number;

export interface Appointment {
  id: number;
  patientName: string;
  appointmentDateTime: string;
  doctorId: number;
  doctorName: string;
  doctorSpecialization: string | null;
  type: AppointmentType | number;
  status: AppointmentStatus | number;
  slotNumber?: number;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string | null;
}

export interface AppointmentFilters {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  type: string;
  doctorId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  selectedDate?: string | null;
  from?: string;
  to?: string;
}