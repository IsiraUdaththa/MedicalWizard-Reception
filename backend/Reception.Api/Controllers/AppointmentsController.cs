
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reception.Api.Data;
using Reception.Api.DTOs;
using Reception.Api.Models;

namespace Reception.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AppointmentsController(
    AppointmentDbContext db) : ControllerBase
{
    private static AppointmentResponse ToResponse(Appointment a, int slotNumber = 1) =>
        new(
            a.Id,
            a.PatientName,
            new DateTimeOffset(
                DateTime.SpecifyKind(a.AppointmentDateTime, DateTimeKind.Utc)),
            a.DoctorId,
            a.Doctor.Name,
            a.Doctor.Specialization,
            a.Type,
            a.Status,
            slotNumber);

    // GET /api/appointments?search=Kamal&status=Scheduled
    //     &doctorId=1&from=2026-10-01T00:00:00Z
    //     &to=2026-11-01T00:00:00Z
    [HttpGet]
    
[HttpGet]
public async Task<ActionResult<PagedResponse<AppointmentResponse>>> GetAll(
    [FromQuery] AppointmentQueryParameters parameters,
    CancellationToken cancellationToken)
{
    // Validate query parameters.
    if (!ModelState.IsValid)
        return ValidationProblem(ModelState);

    if (parameters.From.HasValue &&
        parameters.To.HasValue &&
        parameters.From > parameters.To)
    {
        return BadRequest("'from' must be earlier than or equal to 'to'.");
    }

    if (string.IsNullOrWhiteSpace(parameters.SortBy) ||
        string.IsNullOrWhiteSpace(parameters.SortOrder))
    {
        return BadRequest("'sortBy' and 'sortOrder' cannot be empty.");
    }

    var sortBy = parameters.SortBy.Trim().ToLowerInvariant();
    var sortOrder = parameters.SortOrder.Trim().ToLowerInvariant();

    var descending = sortOrder switch
    {
        "asc" => false,
        "desc" => true,
        _ => (bool?)null
    };

    if (descending is null)
        return BadRequest("'sortOrder' must be 'asc' or 'desc'.");

    var allowedSortFields = new[]
    {
        "date", "patient", "doctor", "status", "type"
    };

    if (!allowedSortFields.Contains(sortBy))
    {
        return BadRequest(
            "'sortBy' must be date, patient, doctor, status, or type.");
    }

    // Parse and validate enum filters.
    AppointmentStatus? status = null;

    if (!string.IsNullOrWhiteSpace(parameters.Status))
    {
        if (!Enum.TryParse<AppointmentStatus>(
                parameters.Status, true, out var parsedStatus) ||
            !Enum.IsDefined(typeof(AppointmentStatus), parsedStatus))
        {
            return BadRequest("Invalid appointment status.");
        }

        status = parsedStatus;
    }

    AppointmentType? type = null;

    if (!string.IsNullOrWhiteSpace(parameters.Type))
    {
        if (!Enum.TryParse<AppointmentType>(
                parameters.Type, true, out var parsedType) ||
            !Enum.IsDefined(typeof(AppointmentType), parsedType))
        {
            return BadRequest("Invalid appointment type.");
        }

        type = parsedType;
    }

    // Start with an IQueryable. Nothing is fetched yet.
    var query = db.Appointments
        .AsNoTracking()
        .AsQueryable();

    // Search patient and doctor names, case-insensitively.
    if (!string.IsNullOrWhiteSpace(parameters.Search))
    {
        var term = parameters.Search.Trim();

        // Escape PostgreSQL LIKE wildcard characters so that search
        // treats user input as literal text.
        var escapedTerm = term
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");

        var pattern = $"%{escapedTerm}%";

        query = query.Where(a =>
            EF.Functions.ILike(a.PatientName, pattern, "\\") ||
            EF.Functions.ILike(a.Doctor.Name, pattern, "\\"));
    }

    // Filters.
    if (parameters.DoctorId.HasValue)
    {
        query = query.Where(
            a => a.DoctorId == parameters.DoctorId.Value);
    }

    if (status.HasValue)
        query = query.Where(a => a.Status == status.Value);

    if (type.HasValue)
        query = query.Where(a => a.Type == type.Value);

    if (parameters.From.HasValue)
    {
        var fromUtc = parameters.From.Value.UtcDateTime;

        query = query.Where(
            a => a.AppointmentDateTime >= fromUtc);
    }

    if (parameters.To.HasValue)
    {
        var toUtc = parameters.To.Value.UtcDateTime;

        query = query.Where(
            a => a.AppointmentDateTime <= toUtc);
    }

    // Count after filtering, but before pagination.
    var totalCount = await query.CountAsync(cancellationToken);

    // Sorting with a stable tie-breaker.
    query = (sortBy, descending.Value) switch
    {
        ("date", false) => query
            .OrderBy(a => a.AppointmentDateTime)
            .ThenBy(a => a.Id),

        ("date", true) => query
            .OrderByDescending(a => a.AppointmentDateTime)
            .ThenByDescending(a => a.Id),

        ("patient", false) => query
            .OrderBy(a => a.PatientName)
            .ThenBy(a => a.Id),

        ("patient", true) => query
            .OrderByDescending(a => a.PatientName)
            .ThenByDescending(a => a.Id),

        ("doctor", false) => query
            .OrderBy(a => a.Doctor.Name)
            .ThenBy(a => a.Id),

        ("doctor", true) => query
            .OrderByDescending(a => a.Doctor.Name)
            .ThenByDescending(a => a.Id),

        ("status", false) => query
            .OrderBy(a => a.Status)
            .ThenBy(a => a.Id),

        ("status", true) => query
            .OrderByDescending(a => a.Status)
            .ThenByDescending(a => a.Id),

        ("type", false) => query
            .OrderBy(a => a.Type)
            .ThenBy(a => a.Id),

        ("type", true) => query
            .OrderByDescending(a => a.Type)
            .ThenByDescending(a => a.Id),

        _ => query
    };

    var totalPages = (int)Math.Ceiling(
        totalCount / (double)parameters.PageSize);

    var appointments = await query
        .Include(a => a.Doctor)
        .Skip((parameters.Page - 1) * parameters.PageSize)
        .Take(parameters.PageSize)
        .ToListAsync(cancellationToken);

    List<AppointmentResponse> items;
    if (appointments.Count == 0)
    {
        items = [];
    }
    else
    {
        var doctorIds = appointments.Select(a => a.DoctorId).Distinct().ToList();
        var dateTimes = appointments.Select(a => a.AppointmentDateTime).Distinct().ToList();

        var slotAppointments = await db.Appointments
            .AsNoTracking()
            .Where(a => doctorIds.Contains(a.DoctorId) && dateTimes.Contains(a.AppointmentDateTime))
            .Select(a => new { a.Id, a.DoctorId, a.AppointmentDateTime })
            .ToListAsync(cancellationToken);

        items = appointments
            .Select(a =>
            {
                var slotNumber = slotAppointments.Count(x =>
                    x.DoctorId == a.DoctorId &&
                    x.AppointmentDateTime == a.AppointmentDateTime &&
                    x.Id <= a.Id);
                return ToResponse(a, slotNumber > 0 ? slotNumber : 1);
            })
            .ToList();
    }

    return Ok(new PagedResponse<AppointmentResponse>(
        items,
        parameters.Page,
        parameters.PageSize,
        totalCount,
        totalPages));
}


    // GET /api/appointments/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentResponse>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments
            .AsNoTracking()
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
            return NotFound();

        var slotNumber = await db.Appointments
            .AsNoTracking()
            .CountAsync(a =>
                a.DoctorId == appointment.DoctorId &&
                a.AppointmentDateTime == appointment.AppointmentDateTime &&
                a.Id <= appointment.Id, cancellationToken);

        return Ok(ToResponse(appointment, slotNumber > 0 ? slotNumber : 1));
    }

    // POST /api/appointments
    [HttpPost]
    public async Task<ActionResult<AppointmentResponse>> Create(
        CreateAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(typeof(AppointmentType), request.Type) ||
            !Enum.IsDefined(typeof(AppointmentStatus), request.Status))
            return BadRequest("Invalid appointment type or status.");

        if (string.IsNullOrWhiteSpace(request.PatientName))
            return BadRequest("Patient name is required.");

        var doctorExists = await db.Doctors.AnyAsync(
            d => d.Id == request.DoctorId, cancellationToken);

        if (!doctorExists)
            return BadRequest("The selected doctor does not exist.");

        var appointment = new Appointment
        {
            PatientName = request.PatientName.Trim(),
            AppointmentDateTime = request.AppointmentDateTime.UtcDateTime,
            DoctorId = request.DoctorId,
            Type = request.Type,
            Status = request.Status
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);

        await db.Entry(appointment)
            .Reference(a => a.Doctor)
            .LoadAsync(cancellationToken);

        var slotNumber = await db.Appointments
            .AsNoTracking()
            .CountAsync(a =>
                a.DoctorId == appointment.DoctorId &&
                a.AppointmentDateTime == appointment.AppointmentDateTime &&
                a.Id <= appointment.Id, cancellationToken);

        var response = ToResponse(appointment, slotNumber > 0 ? slotNumber : 1);

        return CreatedAtAction(
            nameof(GetById),
            new { id = appointment.Id },
            response);
    }

    // PUT /api/appointments/1
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AppointmentResponse>> Update(
        int id,
        UpdateAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(typeof(AppointmentType), request.Type) ||
            !Enum.IsDefined(typeof(AppointmentStatus), request.Status))
            return BadRequest("Invalid appointment type or status.");

        if (string.IsNullOrWhiteSpace(request.PatientName))
            return BadRequest("Patient name is required.");

        var appointment = await db.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
            return NotFound();

        var doctorExists = await db.Doctors.AnyAsync(
            d => d.Id == request.DoctorId, cancellationToken);

        if (!doctorExists)
            return BadRequest("The selected doctor does not exist.");

        appointment.PatientName = request.PatientName.Trim();
        appointment.AppointmentDateTime =
            request.AppointmentDateTime.UtcDateTime;
        appointment.DoctorId = request.DoctorId;
        appointment.Type = request.Type;
        appointment.Status = request.Status;

        await db.SaveChangesAsync(cancellationToken);

        await db.Entry(appointment)
            .Reference(a => a.Doctor)
            .LoadAsync(cancellationToken);

        var slotNumber = await db.Appointments
            .AsNoTracking()
            .CountAsync(a =>
                a.DoctorId == appointment.DoctorId &&
                a.AppointmentDateTime == appointment.AppointmentDateTime &&
                a.Id <= appointment.Id, cancellationToken);

        return Ok(ToResponse(appointment, slotNumber > 0 ? slotNumber : 1));
    }

    // DELETE /api/appointments/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
            return NotFound();

        db.Appointments.Remove(appointment);
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
