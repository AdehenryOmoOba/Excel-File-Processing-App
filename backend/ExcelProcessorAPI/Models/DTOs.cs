using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ExcelProcessorAPI.Models.DTOs
{
    /// <summary>
    /// DTO for uploading Excel data to the API (matches frontend export format)
    /// </summary>
    public class ExcelUploadDto
    {
        [Required]
        public string FileName { get; set; } = string.Empty;
        
        public string? ImportedBy { get; set; }
        
        [Required]
        public MetadataDto Metadata { get; set; } = new();
        
        [Required]
        public Dictionary<string, SheetDataDto> Sheets { get; set; } = new();
    }

    /// <summary>
    /// Metadata information about the Excel file
    /// </summary>
    public class MetadataDto
    {
        public DateTime ExportedAt { get; set; }
        public List<string> ExcludedSheets { get; set; } = new();
    }

    /// <summary>
    /// Represents a sheet with its data
    /// </summary>
    public class SheetDataDto
    {
        [Required]
        public string SheetName { get; set; } = string.Empty;
        
        [Required]
        public List<string> Headers { get; set; } = new();
        
        [Required]
        public List<Dictionary<string, object>> Data { get; set; } = new();
    }

    /// <summary>
    /// Response DTO for successful upload
    /// </summary>
    public class UploadResponseDto
    {
        public Guid SessionId { get; set; }
        public string Message { get; set; } = string.Empty;
        public int ProcessedSheets { get; set; }
        public int TotalRows { get; set; }
        public int ExcludedSheets { get; set; }
        public TimeSpan ProcessingTime { get; set; }
    }

    /// <summary>
    /// DTO for retrieving session data
    /// </summary>
    public class SessionDataDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public DateTime ImportedAt { get; set; }
        public int TotalSheets { get; set; }
        public int ProcessedSheets { get; set; }
        public int ExcludedSheets { get; set; }
        public int TotalRows { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<SheetSummaryDto> Sheets { get; set; } = new();
        public List<ExcludedSheetDto> ExcludedSheetsList { get; set; } = new();
    }

    /// <summary>
    /// Summary information about a sheet
    /// </summary>
    public class SheetSummaryDto
    {
        public Guid Id { get; set; }
        public string SheetName { get; set; } = string.Empty;
        public int SheetIndex { get; set; }
        public int RowCount { get; set; }
        public int ColumnCount { get; set; }
        public List<string> Headers { get; set; } = new();
    }

    /// <summary>
    /// Detailed sheet data for retrieval
    /// </summary>
    public class SheetDetailDto
    {
        public Guid Id { get; set; }
        public string SheetName { get; set; } = string.Empty;
        public int SheetIndex { get; set; }
        public List<string> Headers { get; set; } = new();
        public List<Dictionary<string, object>> Data { get; set; } = new();
    }

    /// <summary>
    /// Information about excluded sheets
    /// </summary>
    public class ExcludedSheetDto
    {
        public string SheetName { get; set; } = string.Empty;
        public string? ExclusionReason { get; set; }
    }

    /// <summary>
    /// DTO for session listing/search
    /// </summary>
    public class SessionListDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public DateTime ImportedAt { get; set; }
        public int TotalSheets { get; set; }
        public int ProcessedSheets { get; set; }
        public int TotalRows { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO for search requests
    /// </summary>
    public class SearchRequestDto
    {
        [Required]
        public string SearchTerm { get; set; } = string.Empty;
        
        public Guid? SessionId { get; set; }
        
        public int PageNumber { get; set; } = 1;
        
        public int PageSize { get; set; } = 50;
    }

    /// <summary>
    /// DTO for search results
    /// </summary>
    public class SearchResultDto
    {
        public string SheetName { get; set; } = string.Empty;
        public int RowIndex { get; set; }
        public Dictionary<string, object> RowData { get; set; } = new();
        public string FileName { get; set; } = string.Empty;
        public DateTime ImportedAt { get; set; }
        public Guid SessionId { get; set; }
    }

    /// <summary>
    /// Paginated response wrapper
    /// </summary>
    public class PagedResponseDto<T>
    {
        public List<T> Data { get; set; } = new();
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }

    /// <summary>
    /// Error response DTO
    /// </summary>
    public class ErrorResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public string? Details { get; set; }
        public List<string> Errors { get; set; } = new();
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}