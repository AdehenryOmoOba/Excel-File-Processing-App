using ExcelProcessorAPI.Data;
using ExcelProcessorAPI.Models;
using ExcelProcessorAPI.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ExcelProcessorAPI.Services
{
    /// <summary>
    /// Interface for Excel data service operations
    /// </summary>
    public interface IExcelDataService
    {
        Task<UploadResponseDto> SaveExcelDataAsync(ExcelUploadDto uploadData);
        Task<SessionDataDto?> GetSessionDataAsync(Guid sessionId);
        Task<SheetDetailDto?> GetSheetDetailAsync(Guid sheetId);
        Task<PagedResponseDto<SessionListDto>> GetSessionsAsync(int pageNumber = 1, int pageSize = 20);
        Task<PagedResponseDto<SearchResultDto>> SearchDataAsync(SearchRequestDto searchRequest);
        Task<bool> DeleteSessionAsync(Guid sessionId);
    }

    /// <summary>
    /// Service for handling Excel data storage and retrieval operations
    /// </summary>
    public class ExcelDataService : IExcelDataService
    {
        private readonly ExcelProcessorContext _context;
        private readonly ILogger<ExcelDataService> _logger;
        private readonly IConfiguration _configuration;

        public ExcelDataService(
            ExcelProcessorContext context, 
            ILogger<ExcelDataService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Saves Excel data to the database
        /// </summary>
        public async Task<UploadResponseDto> SaveExcelDataAsync(ExcelUploadDto uploadData)
        {
            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                _logger.LogInformation("Starting Excel data save process for file: {FileName}", uploadData.FileName);

                // Calculate file hash for duplicate detection
                var fileHash = CalculateFileHash(uploadData);

                // Check for existing file
                var existingSession = await _context.ImportSessions
                    .FirstOrDefaultAsync(s => s.FileHash == fileHash);

                if (existingSession != null)
                {
                    _logger.LogWarning("Duplicate file detected: {FileName}, existing session: {SessionId}", 
                        uploadData.FileName, existingSession.Id);
                    
                    return new UploadResponseDto
                    {
                        SessionId = existingSession.Id,
                        Message = $"File already exists. Existing session ID: {existingSession.Id}",
                        ProcessedSheets = existingSession.ProcessedSheets,
                        TotalRows = existingSession.TotalRows,
                        ExcludedSheets = existingSession.ExcludedSheets,
                        ProcessingTime = TimeSpan.FromMilliseconds(existingSession.ProcessingTimeMs ?? 0)
                    };
                }

                using var transaction = await _context.Database.BeginTransactionAsync();
                
                try
                {
                    // Create import session
                    var session = new ImportSession
                    {
                        FileName = uploadData.FileName,
                        FileHash = fileHash,
                        ImportedBy = uploadData.ImportedBy,
                        TotalSheets = uploadData.Sheets.Count + uploadData.Metadata.ExcludedSheets.Count,
                        ProcessedSheets = uploadData.Sheets.Count,
                        ExcludedSheets = uploadData.Metadata.ExcludedSheets.Count,
                        TotalRows = uploadData.Sheets.Values.Sum(s => s.Data.Count),
                        Status = "Processing"
                    };

                    _context.ImportSessions.Add(session);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Created import session {SessionId} for {FileName}", 
                        session.Id, uploadData.FileName);

                    // Save excluded sheets
                    foreach (var excludedSheetName in uploadData.Metadata.ExcludedSheets)
                    {
                        var excludedSheet = new ExcludedSheet
                        {
                            SessionId = session.Id,
                            SheetName = excludedSheetName,
                            ExclusionReason = "Excluded by user pattern matching"
                        };
                        _context.ExcludedSheets.Add(excludedSheet);
                    }

                    // Process and save sheets
                    var sheetIndex = 0;
                    foreach (var sheetKvp in uploadData.Sheets)
                    {
                        await SaveSheetDataAsync(session.Id, sheetKvp.Value, sheetIndex++);
                    }

                    // Update session status
                    session.Status = "Completed";
                    session.ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds;
                    
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("Successfully saved Excel data for session {SessionId} in {ElapsedMs}ms", 
                        session.Id, stopwatch.ElapsedMilliseconds);

                    return new UploadResponseDto
                    {
                        SessionId = session.Id,
                        Message = "Excel data saved successfully",
                        ProcessedSheets = session.ProcessedSheets,
                        TotalRows = session.TotalRows,
                        ExcludedSheets = session.ExcludedSheets,
                        ProcessingTime = stopwatch.Elapsed
                    };
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving Excel data for file: {FileName}", uploadData.FileName);
                throw;
            }
        }

        /// <summary>
        /// Retrieves session data by ID
        /// </summary>
        public async Task<SessionDataDto?> GetSessionDataAsync(Guid sessionId)
        {
            var session = await _context.ImportSessions
                .Include(s => s.Sheets)
                .Include(s => s.ExcludedSheetsList)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null) return null;

            return new SessionDataDto
            {
                Id = session.Id,
                FileName = session.FileName,
                ImportedAt = session.ImportedAt,
                TotalSheets = session.TotalSheets,
                ProcessedSheets = session.ProcessedSheets,
                ExcludedSheets = session.ExcludedSheets,
                TotalRows = session.TotalRows,
                Status = session.Status,
                Sheets = session.Sheets.OrderBy(s => s.SheetIndex).Select(s => new SheetSummaryDto
                {
                    Id = s.Id,
                    SheetName = s.SheetName,
                    SheetIndex = s.SheetIndex,
                    RowCount = s.RowCount,
                    ColumnCount = s.ColumnCount,
                    Headers = JsonConvert.DeserializeObject<List<string>>(s.Headers)?
                             .Select(h => char.ToLower(h[0]) + h.Substring(1))
                             .ToList() ?? new()
                }).ToList(),
                ExcludedSheetsList = session.ExcludedSheetsList.Select(es => new ExcludedSheetDto
                {
                    SheetName = es.SheetName,
                    ExclusionReason = es.ExclusionReason
                }).ToList()
            };
        }

        /// <summary>
        /// Retrieves detailed sheet data by sheet ID
        /// </summary>
        public async Task<SheetDetailDto?> GetSheetDetailAsync(Guid sheetId)
        {
            var sheet = await _context.Sheets
                .Include(s => s.SheetDataRows)
                .FirstOrDefaultAsync(s => s.Id == sheetId);

            if (sheet == null) return null;

            var data = sheet.SheetDataRows
                .OrderBy(sd => sd.RowIndex)
                .Select(sd => LegacyDataConverter.ConvertLegacyData(sd.RowData))
                .ToList();

            return new SheetDetailDto
            {
                Id = sheet.Id,
                SheetName = sheet.SheetName,
                SheetIndex = sheet.SheetIndex,
                Headers = JsonConvert.DeserializeObject<List<string>>(sheet.Headers)?
                         .Select(h => char.ToLower(h[0]) + h.Substring(1))
                         .ToList() ?? new(),
                Data = data
            };
        }

        /// <summary>
        /// Retrieves paginated list of sessions
        /// </summary>
        public async Task<PagedResponseDto<SessionListDto>> GetSessionsAsync(int pageNumber = 1, int pageSize = 20)
        {
            var query = _context.ImportSessions
                .OrderByDescending(s => s.ImportedAt);

            var totalRecords = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalRecords / pageSize);

            var sessions = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new SessionListDto
                {
                    Id = s.Id,
                    FileName = s.FileName,
                    ImportedAt = s.ImportedAt,
                    TotalSheets = s.TotalSheets,
                    ProcessedSheets = s.ProcessedSheets,
                    TotalRows = s.TotalRows,
                    Status = s.Status
                })
                .ToListAsync();

            return new PagedResponseDto<SessionListDto>
            {
                Data = sessions,
                CurrentPage = pageNumber,
                PageSize = pageSize,
                TotalRecords = totalRecords,
                TotalPages = totalPages,
                HasNextPage = pageNumber < totalPages,
                HasPreviousPage = pageNumber > 1
            };
        }

        /// <summary>
        /// Searches data across all sessions
        /// </summary>
        public async Task<PagedResponseDto<SearchResultDto>> SearchDataAsync(SearchRequestDto searchRequest)
        {
            var query = _context.SheetData
                .Include(sd => sd.Sheet)
                .ThenInclude(s => s!.Session)
                .Where(sd => sd.RowData.Contains(searchRequest.SearchTerm));

            if (searchRequest.SessionId.HasValue)
            {
                query = query.Where(sd => sd.Sheet!.SessionId == searchRequest.SessionId);
            }

            var totalRecords = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalRecords / searchRequest.PageSize);

            var results = await query
                .OrderByDescending(sd => sd.Sheet!.Session!.ImportedAt)
                .ThenBy(sd => sd.Sheet!.SheetIndex)
                .ThenBy(sd => sd.RowIndex)
                .Skip((searchRequest.PageNumber - 1) * searchRequest.PageSize)
                .Take(searchRequest.PageSize)
                .Select(sd => new SearchResultDto
                {
                    SheetName = sd.Sheet!.SheetName,
                    RowIndex = sd.RowIndex,
                    RowData = LegacyDataConverter.ConvertLegacyData(sd.RowData),
                    FileName = sd.Sheet.Session!.FileName,
                    ImportedAt = sd.Sheet.Session.ImportedAt,
                    SessionId = sd.Sheet.SessionId
                })
                .ToListAsync();

            return new PagedResponseDto<SearchResultDto>
            {
                Data = results,
                CurrentPage = searchRequest.PageNumber,
                PageSize = searchRequest.PageSize,
                TotalRecords = totalRecords,
                TotalPages = totalPages,
                HasNextPage = searchRequest.PageNumber < totalPages,
                HasPreviousPage = searchRequest.PageNumber > 1
            };
        }

        /// <summary>
        /// Deletes a session and all its data
        /// </summary>
        public async Task<bool> DeleteSessionAsync(Guid sessionId)
        {
            var session = await _context.ImportSessions.FindAsync(sessionId);
            if (session == null) return false;

            _context.ImportSessions.Remove(session);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Deleted session {SessionId}", sessionId);
            return true;
        }

        /// <summary>
        /// Saves sheet data efficiently using bulk operations
        /// </summary>
        private async Task SaveSheetDataAsync(Guid sessionId, SheetDataDto sheetData, int sheetIndex)
        {
            var sheet = new Sheet
            {
                SessionId = sessionId,
                SheetName = sheetData.SheetName,
                SheetIndex = sheetIndex,
                RowCount = sheetData.Data.Count,
                ColumnCount = sheetData.Headers.Count,
                Headers = JsonConvert.SerializeObject(sheetData.Headers)
            };

            _context.Sheets.Add(sheet);
            await _context.SaveChangesAsync(); // Save to get the sheet ID

            // Bulk insert sheet data
            var batchSize = _configuration.GetValue<int>("ExcelProcessor:BulkInsertBatchSize", 1000);
            
            for (int i = 0; i < sheetData.Data.Count; i += batchSize)
            {
                var batch = sheetData.Data
                    .Skip(i)
                    .Take(batchSize)
                    .Select((row, index) => new SheetData
                    {
                        SheetId = sheet.Id,
                        RowIndex = i + index,
                        RowData = JsonConvert.SerializeObject(ConvertJsonElementsToValues(row))
                    })
                    .ToList();

                _context.SheetData.AddRange(batch);
                await _context.SaveChangesAsync();
            }

            _logger.LogDebug("Saved sheet {SheetName} with {RowCount} rows", 
                sheetData.SheetName, sheetData.Data.Count);
        }

        /// <summary>
        /// Converts JsonElement objects in a dictionary to their actual values
        /// </summary>
        /// <param name="row">Dictionary that may contain JsonElement objects</param>
        /// <returns>Dictionary with properly converted values</returns>
        private static Dictionary<string, object> ConvertJsonElementsToValues(Dictionary<string, object> row)
        {
            var convertedRow = new Dictionary<string, object>();
            
            foreach (var kvp in row)
            {
                var value = kvp.Value;
                
                // Check if the value is a JsonElement (happens when deserializing from JSON)
                if (value is JsonElement jsonElement)
                {
                    value = ConvertJsonElement(jsonElement);
                }
                
                convertedRow[kvp.Key] = value ?? "N/A";
            }
            
            return convertedRow;
        }

        /// <summary>
        /// Converts a JsonElement to its appropriate .NET type
        /// </summary>
        /// <param name="element">JsonElement to convert</param>
        /// <returns>Converted value</returns>
        private static object ConvertJsonElement(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString() ?? "N/A",
                JsonValueKind.Number => element.TryGetInt64(out var longVal) ? longVal : element.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => "N/A",
                JsonValueKind.Undefined => "N/A",
                _ => element.ToString() ?? "N/A"
            };
        }

        /// <summary>
        /// Calculates SHA256 hash of the upload data for duplicate detection
        /// </summary>
        private static string CalculateFileHash(ExcelUploadDto uploadData)
        {
            var dataString = JsonConvert.SerializeObject(uploadData.Sheets, Formatting.None);
            using var sha256 = SHA256.Create();
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(dataString));
            return Convert.ToHexString(hashBytes);
        }
    }
}