using Microsoft.EntityFrameworkCore;
using PixFrameWorkspace.Models.Database;
using System.Diagnostics;

namespace PixFrameWorkspace.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Project> Projects { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                var connectionString = "Host=localhost;Port=5432;Username=pixframe_user;Password=PixFrame@2026Secure;Database=pixframe_workspace";
                optionsBuilder.UseNpgsql(connectionString);
                optionsBuilder.LogTo(message => Debug.WriteLine(message));
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ===== CUSTOMER =====
            modelBuilder.Entity<Customer>()
                .HasKey(c => c.CustomerNumber);

            modelBuilder.Entity<Customer>()
                .Property(c => c.CreatedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Cascade Delete: Wenn Kunde gelöscht, auch Projects löschen
            modelBuilder.Entity<Customer>()
                .HasMany(c => c.Projects)
                .WithOne(p => p.Customer)
                .HasForeignKey(p => p.CustomerNumber)
                .OnDelete(DeleteBehavior.Cascade);

            // ===== PROJECT =====
            modelBuilder.Entity<Project>()
                .HasKey(p => p.ProjectId);

            modelBuilder.Entity<Project>()
                .Property(p => p.CreatedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Index für schnellere Suchen
            modelBuilder.Entity<Project>()
                .HasIndex(p => p.CustomerNumber);
        }
    }
}