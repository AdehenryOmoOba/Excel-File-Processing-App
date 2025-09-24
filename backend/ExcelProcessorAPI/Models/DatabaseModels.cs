using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExcelProcessorAPI.Models
{
    /// <summary>
    /// Represents an Excel file import session
    /// </summary>
    public class ImportSession
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [MaxLength(500)]
        public string FileName { get; set; } = string.Empty;
        
        [MaxLength(64)]
        public string? FileHash { get; set; }
        
        public int TotalSheets { get; set; }
        
        public int ProcessedSheets { get; set; }
        
        public int ExcludedSheets { get; set; }
        
        public int TotalRows { get; set; }
        
        public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
        
        [MaxLength(255)]
        public string? ImportedBy { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = "Completed";
        
        public int? ProcessingTimeMs { get; set; }

        // Navigation properties
        public virtual ICollection<Sheet> Sheets { get; set; } = new List<Sheet>();
        public virtual ICollection<ExcludedSheet> ExcludedSheetsList { get; set; } = new List<ExcludedSheet>();
    }

    /// <summary>
    /// Represents a sheet within an Excel file
    /// </summary>
    public class Sheet
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid SessionId { get; set; }
        
        [Required]
        [MaxLength(255)]
        public string SheetName { get; set; } = string.Empty;
        
        public int SheetIndex { get; set; }
        
        public int RowCount { get; set; }
        
        public int ColumnCount { get; set; }
        
        [Required]
        public string Headers { get; set; } = "[]"; // JSON array
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("SessionId")]
        public virtual ImportSession? Session { get; set; }
        public virtual ICollection<SheetData> SheetDataRows { get; set; } = new List<SheetData>();
    }

    /// <summary>
    /// Represents a row of data within a sheet
    /// </summary>
    public class SheetData
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid SheetId { get; set; }
        
        public int RowIndex { get; set; }
        
        [Required]
        public string RowData { get; set; } = "{}"; // JSON object
        
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [MaxLength(64)]
        public string? RowHash { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("SheetId")]
        public virtual Sheet? Sheet { get; set; }
    }

    /// <summary>
    /// Represents a sheet that was excluded during processing
    /// </summary>
    public class ExcludedSheet
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid SessionId { get; set; }
        
        [Required]
        [MaxLength(255)]
        public string SheetName { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? ExclusionReason { get; set; }

        // Navigation properties
        [ForeignKey("SessionId")]
        public virtual ImportSession? Session { get; set; }
    }

    /// <summary>
    /// Represents processing errors that occurred during import
    /// </summary>
    public class ProcessingError
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid? SessionId { get; set; }
        
        [MaxLength(255)]
        public string? SheetName { get; set; }
        
        public int? RowIndex { get; set; }
        
        public string ErrorMessage { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? ErrorType { get; set; }
        
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("SessionId")]
        public virtual ImportSession? Session { get; set; }
    }
}