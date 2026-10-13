using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Reception.Api.Data;
using Testcontainers.PostgreSql;

namespace Reception.Api.Tests.Infrastructure;

public sealed class PostgresApiFactory : WebApplicationFactory<Program>
{
    private readonly PostgreSqlContainer _postgres =
        new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("appointments_test")
            .WithUsername("test_user")
            .WithPassword("test_password")
            .Build();

    public async Task StartAsync()
    {
        await _postgres.StartAsync();
    }

    protected override void ConfigureWebHost(
        IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<
                DbContextOptions<AppointmentDbContext>>();

            services.AddDbContext<AppointmentDbContext>(
                options => options.UseNpgsql(
                    _postgres.GetConnectionString()));
        });
    }

    public async Task InitializeDatabaseAsync()
    {
        using var scope = Services.CreateScope();

        var db = scope.ServiceProvider
            .GetRequiredService<AppointmentDbContext>();

        await db.Database.MigrateAsync();
    }

    public async Task StopAsync()
    {
        await DisposeAsync();
        await _postgres.DisposeAsync();
    }
}