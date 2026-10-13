using System.ComponentModel.DataAnnotations;

namespace Reception.Api.DTOs;

public sealed class AppointmentQueryParameters
{
    [Range(1, 1_000_000)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;

    [StringLength(200)]
    public string? Search { get; init; }

    public string? Status { get; init; }

    public string? Type { get; init; }

    [Range(1, int.MaxValue)]
    public int? DoctorId { get; init; }

    public DateTimeOffset? From { get; init; }

    public DateTimeOffset? To { get; init; }

    public string SortBy { get; init; } = "date";

    public string SortOrder { get; init; } = "asc";
}