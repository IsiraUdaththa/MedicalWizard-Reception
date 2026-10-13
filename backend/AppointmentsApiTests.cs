using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Reception.Api.DTOs;
using Reception.Api.Models;

namespace Reception.Api.Tests;

public sealed class AppointmentsApiTests
{
    [Fact]
    public async Task GetAll_ReturnsPagedAppointments()
    {
        await using var app = await TestApplication.CreateAsync();

        var result = await app.Client.GetFromJsonAsync<
            PagedResponse<AppointmentResponse>>(
                "/api/appointments?page=1&pageSize=10");

        Assert.NotNull(result);
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(3, result.TotalCount);
        Assert.Equal(1, result.TotalPages);
        Assert.Equal(3, result.Items.Count);
    }

    [Fact]
    public async Task Search_IsCaseInsensitive()
    {
        await using var app = await TestApplication.CreateAsync();

        var result = await app.Client.GetFromJsonAsync<
            PagedResponse<AppointmentResponse>>(
                "/api/appointments?search=KAMAL");

        Assert.NotNull(result);
        Assert.Single(result.Items);
        Assert.Equal("Kamal Perera", result.Items[0].PatientName);
    }

    [Fact]
    public async Task GetAll_FiltersByStatusAndDoctor()
    {
        await using var app = await TestApplication.CreateAsync();

        var result = await app.Client.GetFromJsonAsync<
            PagedResponse<AppointmentResponse>>(
                "/api/appointments?status=Scheduled&doctorId=9001");

        Assert.NotNull(result);
        Assert.Single(result.Items);
        Assert.Equal("Kamal Perera", result.Items[0].PatientName);
        Assert.Equal(9001, result.Items[0].DoctorId);
        Assert.Equal(
            AppointmentStatus.Scheduled,
            result.Items[0].Status);
    }

    [Fact]
    public async Task GetAll_SortsAndPaginates()
    {
        await using var app = await TestApplication.CreateAsync();

        var result = await app.Client.GetFromJsonAsync<
            PagedResponse<AppointmentResponse>>(
                "/api/appointments?page=1&pageSize=1" +
                "&sortBy=patient&sortOrder=desc");

        Assert.NotNull(result);
        Assert.Equal(3, result.TotalCount);
        Assert.Equal(3, result.TotalPages);
        Assert.Single(result.Items);

        // Descending alphabetical order puts Nimal first.
        Assert.Equal("Nimal Fernando", result.Items[0].PatientName);
    }

    [Fact]
    public async Task GetAll_RejectsInvalidQueryParameters()
    {
        await using var app = await TestApplication.CreateAsync();

        var invalidRequests = new[]
        {
            "/api/appointments?page=0",
            "/api/appointments?pageSize=500",
            "/api/appointments?sortBy=password",
            "/api/appointments?status=Invalid",
            "/api/appointments?from=2026-10-20T00:00:00Z" +
                "&to=2026-10-10T00:00:00Z"
        };

        foreach (var url in invalidRequests)
        {
            var response = await app.Client.GetAsync(url);

            Assert.True(
                response.StatusCode == HttpStatusCode.BadRequest,
                $"Expected 400 for {url}, got {(int)response.StatusCode}.");
        }
    }

    [Fact]
    public async Task GetById_ReturnsAppointment_WhenItExists()
    {
        await using var app = await TestApplication.CreateAsync();

        var list = await app.Client.GetFromJsonAsync<
            PagedResponse<AppointmentResponse>>(
                "/api/appointments?page=1&pageSize=10");

        Assert.NotNull(list);

        var appointmentId = list.Items
            .Single(a => a.PatientName == "Kamal Perera").Id;

        var response = await app.Client.GetAsync(
            $"/api/appointments/{appointmentId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var appointment = await response.Content
            .ReadFromJsonAsync<AppointmentResponse>();

        Assert.NotNull(appointment);
        Assert.Equal("Kamal Perera", appointment.PatientName);
        Assert.Equal("Dr Alice Test", appointment.DoctorName);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenItDoesNotExist()
    {
        await using var app = await TestApplication.CreateAsync();

        var response = await app.Client.GetAsync(
            "/api/appointments/2147483647");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAppointment()
    {
        await using var app = await TestApplication.CreateAsync();

        var request = new CreateAppointmentRequest
        {
            PatientName = "New Test Patient",
            AppointmentDateTime =
                new DateTimeOffset(2026, 10, 20, 8, 30, 0, TimeSpan.Zero),
            DoctorId = 9001,
            Type = AppointmentType.Consultation,
            Status = AppointmentStatus.Scheduled
        };

        var response = await app.Client.PostAsJsonAsync(
            "/api/appointments", request);

        Assert.True(
            response.StatusCode == HttpStatusCode.Created ||
            response.StatusCode == HttpStatusCode.OK,
            $"Unexpected status code: {(int)response.StatusCode}");

        var created = await response.Content
            .ReadFromJsonAsync<AppointmentResponse>();

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("New Test Patient", created.PatientName);
        Assert.Equal(9001, created.DoctorId);
        Assert.Equal("Dr Alice Test", created.DoctorName);
    }

    [Fact]
    public async Task Create_RejectsInvalidPatientName()
    {
        await using var app = await TestApplication.CreateAsync();

        var invalidRequest = new
        {
            PatientName = "",
            AppointmentDateTime = "2026-10-20T08:30:00Z",
            DoctorId = 9001,
            Type = AppointmentType.Consultation,
            Status = AppointmentStatus.Scheduled
        };

        var response = await app.Client.PostAsJsonAsync(
            "/api/appointments", invalidRequest);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangesAppointment()
    {
        await using var app = await TestApplication.CreateAsync();

        var list = await app.Client.GetFromJsonAsync<
            PagedResponse<AppointmentResponse>>(
                "/api/appointments?page=1&pageSize=10");

        Assert.NotNull(list);

        var appointmentId = list.Items
            .Single(a => a.PatientName == "Kamal Perera").Id;

        var request = new UpdateAppointmentRequest
        {
            PatientName = "Kamal Updated",
            AppointmentDateTime =
                new DateTimeOffset(2026, 10, 21, 12, 0, 0, TimeSpan.Zero),
            DoctorId = 9002,
            Type = AppointmentType.FollowUp,
            Status = AppointmentStatus.Completed
        };

        var response = await app.Client.PutAsJsonAsync(
            $"/api/appointments/{appointmentId}", request);

        Assert.True(
            response.StatusCode == HttpStatusCode.NoContent ||
            response.StatusCode == HttpStatusCode.OK,
            $"Unexpected status code: {(int)response.StatusCode}");

        var updated = await app.Client.GetFromJsonAsync<AppointmentResponse>(
            $"/api/appointments/{appointmentId}");

        Assert.NotNull(updated);
        Assert.Equal("Kamal Updated", updated.PatientName);
        Assert.Equal(9002, updated.DoctorId);
        Assert.Equal(AppointmentStatus.Completed, updated.Status);
    }

    [Fact]
    public async Task Delete_RemovesAppointment()
    {
        await using var app = await TestApplication.CreateAsync();

        var list = await app.Client.GetFromJsonAsync<
            PagedResponse<AppointmentResponse>>(
                "/api/appointments?page=1&pageSize=10");

        Assert.NotNull(list);

        var appointmentId = list.Items
            .Single(a => a.PatientName == "Kamal Perera").Id;

        var response = await app.Client.DeleteAsync(
            $"/api/appointments/{appointmentId}");

        Assert.True(
            response.StatusCode == HttpStatusCode.NoContent ||
            response.StatusCode == HttpStatusCode.OK,
            $"Unexpected status code: {(int)response.StatusCode}");

        var getResponse = await app.Client.GetAsync(
            $"/api/appointments/{appointmentId}");

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }
}