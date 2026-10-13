using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reception.Api.Data;
using Reception.Api.DTOs;
using Reception.Api.Models;

namespace Reception.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class DoctorsController(
    AppointmentDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DoctorResponse>>> GetDoctors(
        CancellationToken cancellationToken)
    {
        var doctors = await db.Doctors
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new DoctorResponse(
                d.Id,
                d.Name,
                d.Specialization
            ))
            .ToListAsync(cancellationToken);

        return Ok(doctors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DoctorResponse>> GetDoctorById(
        int id,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (doctor is null)
            return NotFound();

        return Ok(new DoctorResponse(doctor.Id, doctor.Name, doctor.Specialization));
    }

    [HttpPost]
    public async Task<ActionResult<DoctorResponse>> CreateDoctor(
        [FromBody] CreateDoctorRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Doctor name is required.");

        var trimmedName = request.Name.Trim();
        var trimmedSpecialization = string.IsNullOrWhiteSpace(request.Specialization)
            ? null
            : request.Specialization.Trim();

        var doctor = new Doctor
        {
            Name = trimmedName,
            Specialization = trimmedSpecialization
        };

        db.Doctors.Add(doctor);
        await db.SaveChangesAsync(cancellationToken);

        var response = new DoctorResponse(doctor.Id, doctor.Name, doctor.Specialization);

        return CreatedAtAction(
            nameof(GetDoctorById),
            new { id = doctor.Id },
            response);
    }
}
