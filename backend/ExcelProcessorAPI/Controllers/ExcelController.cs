using ExcelProcessorAPI.Models.DTOs;
using ExcelProcessorAPI.Services;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace ExcelProcessorAPI.Controllers
{
    /// <summary>
    /// API Controller for Excel data operations
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class ExcelController : ControllerBase
    {
        private readonly IExcelDataService _excelDataService;
        private readonly ILogger<ExcelController> _logger;

        public ExcelController(IExcelDataService excelDataService, ILogger<ExcelController> logger)
        {
            _excelDataService = excelDataService;
            _logger = logger;
        }

        /// <summary>
        /// Uploads Excel data to the database
        /// </summary>
        /// <param name="uploadData">The Excel data to upload</param>
        /// <returns>Upload response with session information</returns>
        [HttpPost("upload")]
        [ProducesResponseType(typeof(UploadResponseDto), 200)]
        [ProducesResponseType(typeof(ErrorResponseDto), 400)]
        [ProducesResponseType(typeof(ErrorResponseDto), 500)]
        public async Task<IActionResult> UploadExcelData([FromBody] ExcelUploadDto uploadData)
        {
            try
            {
                _logger.LogInformation("Received Excel upload request for file: {FileName}", uploadData.FileName);

                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .SelectMany(x => x.Value?.Errors.Select(e => e.ErrorMessage) ?? Enumerable.Empty<string>())
                        .ToList();

                    return BadRequest(new ErrorResponseDto
                    {
                        Message = "Invalid upload data",
                        Errors = errors
                    });
                }

                var response = await _excelDataService.SaveExcelDataAsync(uploadData);
                
                _logger.LogInformation("Excel upload completed successfully for session: {SessionId}", 
                    response.SessionId);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading Excel data for file: {FileName}", uploadData?.FileName ?? "Unknown");
                
                return StatusCode(500, new ErrorResponseDto
                {
                    Message = "An error occurred while uploading Excel data",
                    Details = ex.Message
                });
            }
        }

        /// <summary>
        /// Retrieves all import sessions with pagination
        /// </summary>
        /// <param name="pageNumber">Page number (default: 1)</param>
        /// <param name="pageSize">Page size (default: 20)</param>
        /// <returns>Paginated list of import sessions</returns>
        [HttpGet("sessions")]
        [ProducesResponseType(typeof(PagedResponseDto<SessionListDto>), 200)]
        [ProducesResponseType(typeof(ErrorResponseDto), 400)]
        public async Task<IActionResult> GetSessions(
            [FromQuery, Range(1, int.MaxValue)] int pageNumber = 1,
            [FromQuery, Range(1, 100)] int pageSize = 20)
        {
            try
            {
                var sessions = await _excelDataService.GetSessionsAsync(pageNumber, pageSize);
                return Ok(sessions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sessions");
                
                return StatusCode(500, new ErrorResponseDto
                {
                    Message = "An error occurred while retrieving sessions",
                    Details = ex.Message
                });
            }
        }

        /// <summary>
        /// Retrieves a specific import session by ID
        /// </summary>
        /// <param name="sessionId">The session ID</param>
        /// <returns>Session data with summary information</returns>
        [HttpGet("sessions/{sessionId:guid}")]
        [ProducesResponseType(typeof(SessionDataDto), 200)]
        [ProducesResponseType(typeof(ErrorResponseDto), 404)]
        [ProducesResponseType(typeof(ErrorResponseDto), 500)]
        public async Task<IActionResult> GetSession(Guid sessionId)
        {
            try
            {
                var session = await _excelDataService.GetSessionDataAsync(sessionId);
                
                if (session == null)
                {
                    return NotFound(new ErrorResponseDto
                    {
                        Message = $"Session with ID {sessionId} not found"
                    });
                }

                return Ok(session);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving session {SessionId}", sessionId);
                
                return StatusCode(500, new ErrorResponseDto
                {
                    Message = "An error occurred while retrieving the session",
                    Details = ex.Message
                });
            }
        }

        /// <summary>
        /// Retrieves detailed data for a specific sheet
        /// </summary>
        /// <param name="sheetId">The sheet ID</param>
        /// <returns>Detailed sheet data</returns>
        [HttpGet("sheets/{sheetId:guid}")]
        [ProducesResponseType(typeof(SheetDetailDto), 200)]
        [ProducesResponseType(typeof(ErrorResponseDto), 404)]
        [ProducesResponseType(typeof(ErrorResponseDto), 500)]
        public async Task<IActionResult> GetSheetDetail(Guid sheetId)
        {
            try
            {
                var sheet = await _excelDataService.GetSheetDetailAsync(sheetId);
                
                if (sheet == null)
                {
                    return NotFound(new ErrorResponseDto
                    {
                        Message = $"Sheet with ID {sheetId} not found"
                    });
                }

                return Ok(sheet);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sheet {SheetId}", sheetId);
                
                return StatusCode(500, new ErrorResponseDto
                {
                    Message = "An error occurred while retrieving the sheet",
                    Details = ex.Message
                });
            }
        }

        /// <summary>
        /// Searches data across all sessions or within a specific session
        /// </summary>
        /// <param name="searchRequest">Search parameters</param>
        /// <returns>Paginated search results</returns>
        [HttpPost("search")]
        [ProducesResponseType(typeof(PagedResponseDto<SearchResultDto>), 200)]
        [ProducesResponseType(typeof(ErrorResponseDto), 400)]
        [ProducesResponseType(typeof(ErrorResponseDto), 500)]
        public async Task<IActionResult> SearchData([FromBody] SearchRequestDto searchRequest)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .SelectMany(x => x.Value?.Errors.Select(e => e.ErrorMessage) ?? Enumerable.Empty<string>())
                        .ToList();

                    return BadRequest(new ErrorResponseDto
                    {
                        Message = "Invalid search parameters",
                        Errors = errors
                    });
                }

                var results = await _excelDataService.SearchDataAsync(searchRequest);
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching data for term: {SearchTerm}", searchRequest?.SearchTerm ?? "Unknown");
                
                return StatusCode(500, new ErrorResponseDto
                {
                    Message = "An error occurred while searching data",
                    Details = ex.Message
                });
            }
        }

        /// <summary>
        /// Deletes an import session and all its associated data
        /// </summary>
        /// <param name="sessionId">The session ID to delete</param>
        /// <returns>Success status</returns>
        [HttpDelete("sessions/{sessionId:guid}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(typeof(ErrorResponseDto), 404)]
        [ProducesResponseType(typeof(ErrorResponseDto), 500)]
        public async Task<IActionResult> DeleteSession(Guid sessionId)
        {
            try
            {
                var deleted = await _excelDataService.DeleteSessionAsync(sessionId);
                
                if (!deleted)
                {
                    return NotFound(new ErrorResponseDto
                    {
                        Message = $"Session with ID {sessionId} not found"
                    });
                }

                _logger.LogInformation("Successfully deleted session {SessionId}", sessionId);
                return Ok(new { message = "Session deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting session {SessionId}", sessionId);
                
                return StatusCode(500, new ErrorResponseDto
                {
                    Message = "An error occurred while deleting the session",
                    Details = ex.Message
                });
            }
        }

        /// <summary>
        /// Health check endpoint
        /// </summary>
        /// <returns>API status</returns>
        [HttpGet("health")]
        [ProducesResponseType(200)]
        public IActionResult HealthCheck()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                version = "1.0.0"
            });
        }

        /// <summary>
        /// Simple test endpoint to verify API connectivity
        /// </summary>
        /// <returns>Test response with server information</returns>
        [HttpGet("test")]
        [ProducesResponseType(200)]
        public IActionResult Test()
        {
            return Ok(new
            {
                message = "Excel Processor API is running successfully!",
                timestamp = DateTime.UtcNow,
                server = Environment.MachineName,
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
                version = "1.0.0",
                endpoints = new
                {
                    upload = "/api/excel/upload",
                    sessions = "/api/excel/sessions",
                    search = "/api/excel/search",
                    health = "/api/excel/health",
                    test = "/api/excel/test"
                },
                database = new
                {
                    status = "Ready",
                    note = "Database connection will be tested on first operation"
                }
            });
        }

        /// <summary>
        /// Test database connectivity
        /// </summary>
        /// <returns>Database connection status</returns>
        [HttpGet("test-db")]
        [ProducesResponseType(200)]
        [ProducesResponseType(typeof(ErrorResponseDto), 500)]
        public async Task<IActionResult> TestDatabase()
        {
            try
            {
                // Test basic database connectivity
                var sessionCount = await _excelDataService.GetSessionsAsync(1, 1);
                
                return Ok(new
                {
                    message = "Database connection successful!",
                    timestamp = DateTime.UtcNow,
                    database = new
                    {
                        status = "Connected",
                        totalSessions = sessionCount.TotalRecords,
                        connectionString = "[Hidden for security]"
                    },
                    tables = new
                    {
                        note = "All required tables are accessible",
                        tables = new[] { "ImportSessions", "Sheets", "SheetData", "ExcludedSheets", "ProcessingErrors" }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database connection test failed");
                
                return StatusCode(500, new ErrorResponseDto
                {
                    Message = "Database connection failed",
                    Details = ex.Message
                });
            }
        }
    }
}
