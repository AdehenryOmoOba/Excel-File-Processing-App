using Microsoft.EntityFrameworkCore;
using ExcelProcessorAPI.Models;

namespace ExcelProcessorAPI.Data
{
    /// <summary>
    /// Entity Framework Core database context for Excel Processor
    /// </summary>
    public class ExcelProcessorContext : DbContext
    {
        public ExcelProcessorContext(DbContextOptions<ExcelProcessorContext> options)
            : base(options)
        {
        }

        // DbSets for each entity
        public DbSet<ImportSession> ImportSessions { get; set; }
        public DbSet<Sheet> Sheets { get; set; }
        public DbSet<SheetData> SheetData { get; set; }
        public DbSet<ExcludedSheet> ExcludedSheets { get; set; }
        public DbSet<ProcessingError> ProcessingErrors { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure ImportSessions
            modelBuilder.Entity<ImportSession>(entity =>
            {
                entity.ToTable("ImportSessions");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.FileName)
                    .IsRequired()
                    .HasMaxLength(500);
                    
                entity.Property(e => e.FileHash)
                    .HasMaxLength(64);
                    
                entity.Property(e => e.ImportedBy)
                    .HasMaxLength(255);
                    
                entity.Property(e => e.Status)
                    .HasMaxLength(50)
                    .HasDefaultValue("Completed");
                    
                entity.Property(e => e.ImportedAt)
                    .HasDefaultValueSql("GETDATE()");

                // Indexes for performance
                entity.HasIndex(e => e.ImportedAt)
                    .HasDatabaseName("IX_ImportSessions_ImportedAt");
                    
                entity.HasIndex(e => e.FileName)
                    .HasDatabaseName("IX_ImportSessions_FileName");
                    
                entity.HasIndex(e => e.FileHash)
                    .HasDatabaseName("IX_ImportSessions_FileHash");
            });

            // Configure Sheets
            modelBuilder.Entity<Sheet>(entity =>
            {
                entity.ToTable("Sheets");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.SheetName)
                    .IsRequired()
                    .HasMaxLength(255);
                    
                entity.Property(e => e.Headers)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("GETDATE()");

                // Foreign key relationship
                entity.HasOne(e => e.Session)
                    .WithMany(e => e.Sheets)
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Indexes
                entity.HasIndex(e => e.SessionId)
                    .HasDatabaseName("IX_Sheets_SessionId");
                    
                entity.HasIndex(e => new { e.SessionId, e.SheetName })
                    .HasDatabaseName("IX_Sheets_SheetName");
            });

            // Configure SheetData
            modelBuilder.Entity<SheetData>(entity =>
            {
                entity.ToTable("SheetData");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.RowData)
                    .IsRequired();
                    
                // Computed column for row hash
                entity.Property(e => e.RowHash)
                    .HasComputedColumnSql("CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', RowData), 2)", stored: true)
                    .HasMaxLength(64);
                    
                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("GETDATE()");

                // Foreign key relationship
                entity.HasOne(e => e.Sheet)
                    .WithMany(e => e.SheetDataRows)
                    .HasForeignKey(e => e.SheetId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Indexes for performance
                entity.HasIndex(e => new { e.SheetId, e.RowIndex })
                    .HasDatabaseName("IX_SheetData_SheetId_RowIndex");
                    
                entity.HasIndex(e => new { e.SheetId, e.RowHash })
                    .HasDatabaseName("IX_SheetData_RowHash");
            });

            // Configure ExcludedSheets
            modelBuilder.Entity<ExcludedSheet>(entity =>
            {
                entity.ToTable("ExcludedSheets");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.SheetName)
                    .IsRequired()
                    .HasMaxLength(255);
                    
                entity.Property(e => e.ExclusionReason)
                    .HasMaxLength(500);

                // Foreign key relationship
                entity.HasOne(e => e.Session)
                    .WithMany(e => e.ExcludedSheetsList)
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Index
                entity.HasIndex(e => e.SessionId)
                    .HasDatabaseName("IX_ExcludedSheets_SessionId");
            });

            // Configure ProcessingErrors
            modelBuilder.Entity<ProcessingError>(entity =>
            {
                entity.ToTable("ProcessingErrors");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.SheetName)
                    .HasMaxLength(255);
                    
                entity.Property(e => e.ErrorType)
                    .HasMaxLength(100);
                    
                entity.Property(e => e.OccurredAt)
                    .HasDefaultValueSql("GETDATE()");

                // Foreign key relationship (nullable)
                entity.HasOne(e => e.Session)
                    .WithMany()
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired(false);

                // Index
                entity.HasIndex(e => e.SessionId)
                    .HasDatabaseName("IX_ProcessingErrors_SessionId");
            });
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                // This will be overridden by dependency injection, but provides a fallback
                optionsBuilder.UseSqlServer("Server=.;Database=ExcelProcessorDB;Trusted_Connection=true;TrustServerCertificate=true;");
            }
        }
    }
}