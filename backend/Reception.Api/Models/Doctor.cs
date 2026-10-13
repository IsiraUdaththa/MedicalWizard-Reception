namespace Reception.Api.Models;

public sealed class Doctor
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string? Specialization { get; set; }

    public ICollection<Appointment> Appointments { get; } = new List<Appointment>();
}
