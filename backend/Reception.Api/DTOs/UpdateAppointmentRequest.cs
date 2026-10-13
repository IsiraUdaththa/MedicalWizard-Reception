
using System.ComponentModel.DataAnnotations;
using Reception.Api.Models;

namespace Reception.Api.DTOs;

public sealed class UpdateAppointmentRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public required string PatientName { get; init; }

    public DateTimeOffset AppointmentDateTime { get; init; }

    [Range(1, int.MaxValue)]
    public int DoctorId { get; init; }

    [EnumDataType(typeof(AppointmentType))]
    public AppointmentType Type { get; init; }

    [EnumDataType(typeof(AppointmentStatus))]
    public AppointmentStatus Status { get; init; }
}
