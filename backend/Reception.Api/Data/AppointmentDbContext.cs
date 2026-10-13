using Microsoft.EntityFrameworkCore;
using Reception.Api.Models;

namespace Reception.Api.Data;

public sealed class AppointmentDbContext(DbContextOptions<AppointmentDbContext> options)
    : DbContext(options)
{
    public DbSet<Appointment> Appointments => Set<Appointment>();

    public DbSet<Doctor> Doctors => Set<Doctor>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.Property(a => a.PatientName).HasMaxLength(200).IsRequired();

            entity.Property(a => a.Type).HasConversion<string>().HasMaxLength(32);

            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(32);

            entity
                .HasOne(a => a.Doctor)
                .WithMany(d => d.Appointments)
                .HasForeignKey(a => a.DoctorId)
                .IsRequired();
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.Property(d => d.Name).HasMaxLength(200).IsRequired();

            entity.Property(d => d.Specialization).HasMaxLength(200);
        });

        modelBuilder
            .Entity<Doctor>()
            .HasData(
                new Doctor
                {
                    Id = 1,
                    Name = "Dr. Perera",
                    Specialization = "General Medicine",
                },
                new Doctor
                {
                    Id = 2,
                    Name = "Dr. Fernando",
                    Specialization = "Cardiology",
                },
                new Doctor
                {
                    Id = 3,
                    Name = "Dr. Silva",
                    Specialization = "Dermatology",
                }
            );
    }
}
