using Microsoft.EntityFrameworkCore;
using Reception.Api.Data;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppointmentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Appointments"))
);

var app = builder.Build();

// 1. Auto-apply database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppointmentDbContext>();
    if (db.Database.IsRelational())
    {
        db.Database.Migrate();
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// 2. Serve React SPA static files
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// 3. Fallback routing for SPA (browser refresh on deep links)
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }