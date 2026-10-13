
using Reception.Api.Models;

namespace Reception.Api.DTOs;

public sealed record AppointmentResponse(
    int Id,
    string PatientName,
    DateTimeOffset AppointmentDateTime,
    int DoctorId,
    string DoctorName,
    string? DoctorSpecialization,
    AppointmentType Type,
    AppointmentStatus Status,
    int SlotNumber = 1);
