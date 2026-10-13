namespace Reception.Api.DTOs;

public sealed record DoctorResponse(
    int Id,
    string Name,
    string? Specialization);
