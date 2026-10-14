# ClinicDesk

[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**ClinicDesk** is a medical clinic reception and appointment management system. It provides front-desk receptionists with a fast, keyboard-friendly workflow to register patients, coordinate schedules, manage doctor availability, and track appointment sequence numbering.



## Table of Contents
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Quick Start (Zero-Build via Docker)](#quick-start-zero-build-via-docker)
- [Local Development Setup](#local-development-setup)
- [API Reference](#api-reference)
- [Automated Testing & Quality Assurance](#automated-testing--quality-assurance)
- [Single-Container Production Architecture](#single-container-production-architecture)
- [Environment Variables](#environment-variables)



## Key Features

### 1. Appointment Management
- **Full Lifecycle**: Create, view, update, reschedule, and delete patient appointments.
- **Fast Full-Text Search**: Case-insensitive search across patient names and attending doctor names.
- **Date Filtering with Interactive Calendar**: Filter bookings for any selected date or browse the full schedule.
- **Quick Status & Type Toggles**: Filter instantly between statuses (*Scheduled, Completed, Cancelled*) and appointment types (*Consultation, Follow-up, Checkup, Emergency*).
- **Multi-column Sorting & Pagination**: Sort by appointment date, patient name, doctor, status, or type with stable tie-breakers.

### 2. Backend-Computed Slot Numbering
- **Doctor & Time Slot Queue Position**: Automatically calculates sequential queue numbers (`#1`, `#2`, etc.) for appointments booked for the **same doctor at the same scheduled time**.
- **Server-Side Integrity**: Calculations run in PostgreSQL/EF Core to ensure absolute consistency across pages and concurrent bookings.

### 3. Doctor Roster & On-The-Fly Addition
- **Dedicated Doctor Management**: Register doctors with names and specializations (*Cardiology, General Medicine, Pediatrics, Dermatology, Neurology, etc.*).
- **In-Drawer Quick Creation**: Add a new doctor directly from the appointment booking drawer without losing form state; the newly registered doctor is automatically selected.

### 4. Receptionist-First Ergonomics
- **Keyboard Navigation**: Press <kbd>Enter</kbd> to naturally advance across text fields and search inputs.
- **Quick Slot Presets**: 1-click time slot selections (*08:30, 09:00, 10:00, 14:00, etc.*) and date shortcuts (*Today, Tomorrow*).
- **Time Zone Awareness**: Formats schedules in Sri Lanka Standard Time (`Asia/Colombo`).
- **Non-Disruptive UX**: Slide-over drawer with instant TanStack Query cache invalidation and smooth transitions.



## Architecture & Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Class Variance Authority
- **State & Server Cache**: TanStack React Query v5
- **Icons & Dates**: Lucide React + date-fns v4
- **Linter**: Oxlint (0 errors, 0 warnings)

### Backend
- **Framework**: ASP.NET Core 10 Web API (.NET 10)
- **Database / ORM**: PostgreSQL 17 + Entity Framework Core 10 (Npgsql)
- **API Documentation**: OpenAPI / Scalar API Reference
- **Testing**: xUnit + EF Core In-Memory

## Quick Start (Zero-Build via Docker)

The easiest way to run and evaluate the complete application without installing .NET SDK or Node.js locally is with **Docker Compose**:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/MedicalWizard-Reception.git
cd MedicalWizard-Reception
```

### 2. Launch with Docker Compose
```bash
docker compose up -d --build
```

### 3. Access the Application
- **Web Application**: [http://localhost:8080](http://localhost:8080)
- **API Documentation (Scalar)**: [http://localhost:8080/scalar/v1](http://localhost:8080/scalar/v1) *(when running in Development)*
- **OpenAPI Schema**: [http://localhost:8080/openapi/v1.json](http://localhost:8080/openapi/v1.json)

Database tables and initial seeded doctors (`Dr. Perera`, `Dr. Fernando`, `Dr. Silva`) are automatically created on boot via EF Core migrations.

To stop the containers:
```bash
docker compose down
```



## Local Development Setup

To run the backend and frontend separately for development:

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 22+](https://nodejs.org/) & `npm`
- [Docker](https://www.docker.com/) (to run PostgreSQL) or a local PostgreSQL instance

### 1. Start the Database
Start only the PostgreSQL service using Docker Compose:
```bash
docker compose up -d db
```
*(Database runs on `localhost:5432` with user `app`, password `dev_only_password`, database `reception`).*

### 2. Run the Backend API
```bash
cd backend/Reception.Api
dotnet run
```
The API will launch at `http://localhost:5000` (or the port defined in `Properties/launchSettings.json`).

### 3. Run the Frontend Client
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). Requests to `/api/*` are automatically proxied to the backend.


## License

This project was built as an assessment solution for MedicalWizard. Open for evaluation and review.
