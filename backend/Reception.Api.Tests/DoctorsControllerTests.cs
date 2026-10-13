using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reception.Api.Controllers;
using Reception.Api.Data;
using Reception.Api.DTOs;
using Reception.Api.Models;

namespace Reception.Api.Tests;

public sealed class DoctorsControllerTests
{
    private static AppointmentDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppointmentDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new AppointmentDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task GetDoctors_ReturnsAllDoctorsOrderedByName()
    {
        await using var db = CreateDbContext();
        var controller = new DoctorsController(db);

        var actionResult = await controller.GetDoctors(CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<DoctorResponse>>(okResult.Value);

        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task GetDoctorById_ReturnsDoctor_WhenFound()
    {
        await using var db = CreateDbContext();
        var controller = new DoctorsController(db);

        var actionResult = await controller.GetDoctorById(1, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var doctor = Assert.IsType<DoctorResponse>(okResult.Value);

        Assert.Equal(1, doctor.Id);
        Assert.Equal("Dr. Perera", doctor.Name);
    }

    [Fact]
    public async Task GetDoctorById_ReturnsNotFound_WhenNotFound()
    {
        await using var db = CreateDbContext();
        var controller = new DoctorsController(db);

        var actionResult = await controller.GetDoctorById(9999, CancellationToken.None);
        Assert.IsType<NotFoundResult>(actionResult.Result);
    }

    [Fact]
    public async Task CreateDoctor_AddsDoctorAndReturnsCreated()
    {
        await using var db = CreateDbContext();
        var controller = new DoctorsController(db);

        var request = new CreateDoctorRequest(" Dr. Samantha Wickramasinghe ", " Neurology ");
        var actionResult = await controller.CreateDoctor(request, CancellationToken.None);

        var createdResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        var response = Assert.IsType<DoctorResponse>(createdResult.Value);

        Assert.True(response.Id > 0);
        Assert.Equal("Dr. Samantha Wickramasinghe", response.Name);
        Assert.Equal("Neurology", response.Specialization);

        var doctorInDb = await db.Doctors.FindAsync(response.Id);
        Assert.NotNull(doctorInDb);
        Assert.Equal("Dr. Samantha Wickramasinghe", doctorInDb.Name);
        Assert.Equal("Neurology", doctorInDb.Specialization);
    }

    [Fact]
    public async Task CreateDoctor_RejectsEmptyName()
    {
        await using var db = CreateDbContext();
        var controller = new DoctorsController(db);

        var request = new CreateDoctorRequest("   ", "Cardiology");
        var actionResult = await controller.CreateDoctor(request, CancellationToken.None);

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        Assert.Equal("Doctor name is required.", badRequestResult.Value);
    }

    [Fact]
    public async Task CreateDoctor_AllowsNullSpecialization()
    {
        await using var db = CreateDbContext();
        var controller = new DoctorsController(db);

        var request = new CreateDoctorRequest("Dr. No Specialty", "  ");
        var actionResult = await controller.CreateDoctor(request, CancellationToken.None);

        var createdResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        var response = Assert.IsType<DoctorResponse>(createdResult.Value);

        Assert.Equal("Dr. No Specialty", response.Name);
        Assert.Null(response.Specialization);
    }
}
