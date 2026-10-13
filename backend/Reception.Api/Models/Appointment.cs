namespace Reception.Api.Models;

public enum AppointmentType
{
    Consultation,
    FollowUp,
    Checkup,
    Emergency,
}

public enum AppointmentStatus
{
    Scheduled,
    Completed,
    Cancelled,
}

public sealed class Appointment
{
    public int Id { get; set; }

    public required string PatientName { get; set; }

    public DateTime AppointmentDateTime { get; set; }

    public int DoctorId { get; set; }

    public Doctor Doctor { get; set; } = null!;

    public AppointmentType Type { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
}
