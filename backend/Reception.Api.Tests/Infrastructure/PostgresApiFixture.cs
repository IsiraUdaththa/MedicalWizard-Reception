using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Reception.Api.Data;
using Reception.Api.Models;
using Reception.Api.Tests.Infrastructure;

namespace Reception.Api.Tests;

public sealed class TestApplication : IAsyncDisposable
{
    private readonly PostgresApiFactory _factory;

    public HttpClient Client { get; }

    private TestApplication(PostgresApiFactory factory, HttpClient client)
    {
        _factory = factory;
        Client = client;
    }

    public static async Task<TestApplication> CreateAsync()
    {
        var factory = new PostgresApiFactory();

        try
        {
            await factory.StartAsync();

            // Starts the API host and its dependency injection container.
            var client = factory.CreateClient();

            await factory.InitializeDatabaseAsync();
            await SeedAsync(factory);

            return new TestApplication(factory, client);
        }
        catch
        {
            await factory.StopAsync();
            throw;
        }
    }

    private static async Task SeedAsync(PostgresApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();

        var db = scope.ServiceProvider
            .GetRequiredService<AppointmentDbContext>();

        db.Appointments.RemoveRange(await db.Appointments.ToListAsync());
        db.Doctors.RemoveRange(await db.Doctors.ToListAsync());

        await db.SaveChangesAsync();

        var doctorA = new Doctor
        {
            Id = 9001,
            Name = "Dr Alice Test",
            Specialization = "General Medicine"
        };

        var doctorB = new Doctor
        {
            Id = 9002,
            Name = "Dr Bob Test",
            Specialization = "Cardiology"
        };

        db.Doctors.AddRange(doctorA, doctorB);

        db.Appointments.AddRange(
            new Appointment
            {
                PatientName = "Kamal Perera",
                AppointmentDateTime =
                    new DateTime(2026, 10, 14, 9, 0, 0, DateTimeKind.Utc),
                DoctorId = doctorA.Id,
                Type = AppointmentType.Consultation,
                Status = AppointmentStatus.Scheduled
            },
            new Appointment
            {
                PatientName = "Alice Silva",
                AppointmentDateTime =
                    new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc),
                DoctorId = doctorB.Id,
                Type = AppointmentType.FollowUp,
                Status = AppointmentStatus.Completed
            },
            new Appointment
            {
                PatientName = "Nimal Fernando",
                AppointmentDateTime =
                    new DateTime(2026, 10, 16, 11, 0, 0, DateTimeKind.Utc),
                DoctorId = doctorA.Id,
                Type = AppointmentType.Checkup,
                Status = AppointmentStatus.Cancelled
            });

        await db.SaveChangesAsync();
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _factory.StopAsync();
    }
}