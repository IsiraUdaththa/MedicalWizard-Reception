using System.ComponentModel.DataAnnotations;

namespace Reception.Api.DTOs;

public sealed record CreateDoctorRequest(
    [Required(ErrorMessage = "Doctor name is required.")]
    [StringLength(200, ErrorMessage = "Doctor name cannot exceed 200 characters.")]
    string Name,
    [StringLength(200, ErrorMessage = "Specialization cannot exceed 200 characters.")]
    string? Specialization = null);
