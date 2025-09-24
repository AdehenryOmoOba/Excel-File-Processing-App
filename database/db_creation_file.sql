
-- Excel Processor Database Schema - Final Version with Square Brackets
-- Run this script in SQL Server Management Studio
-- Reserved keywords are properly escaped with square brackets

USE [ExcelProcessorDB] -- Change this to your database name if different
GO

-- Drop existing objects if they exist (for clean reinstall)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_vw_RecentSessions')
    DROP INDEX IX_vw_RecentSessions ON vw_RecentSessions;
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_RecentSessions')
    DROP VIEW vw_RecentSessions;
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_SearchData')
    DROP PROCEDURE sp_SearchData;
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetSessionData')
    DROP PROCEDURE sp_GetSessionData;
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_BulkInsertSheetData')
    DROP PROCEDURE sp_BulkInsertSheetData;
GO

IF EXISTS (SELECT * FROM sys.types WHERE name = 'SheetDataTableType')
    DROP TYPE SheetDataTableType;
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_InsertImportSession')
    DROP PROCEDURE sp_InsertImportSession;
GO

-- Drop tables in correct order (child tables first)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ProcessingErrors')
    DROP TABLE ProcessingErrors;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ExcludedSheets')
    DROP TABLE ExcludedSheets;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'SheetData')
    DROP TABLE SheetData;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Sheets')
    DROP TABLE Sheets;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ImportSessions')
    DROP TABLE ImportSessions;
GO

-- Create tables in correct order

-- 1. Import Sessions Table (Main tracking table)
CREATE TABLE ImportSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FileName NVARCHAR(500) NOT NULL,
    FileHash NVARCHAR(64), -- SHA256 hash to detect duplicate files
    TotalSheets INT NOT NULL,
    ProcessedSheets INT NOT NULL,
    ExcludedSheets INT NOT NULL,
    TotalRows INT NOT NULL,
    ImportedAt DATETIME2 DEFAULT GETDATE(),
    ImportedBy NVARCHAR(255),
    [Status] NVARCHAR(50) DEFAULT 'Completed', -- Status is reserved, so use brackets
    ProcessingTimeMs INT
);
GO

-- Create indexes for ImportSessions
CREATE INDEX IX_ImportSessions_ImportedAt ON ImportSessions (ImportedAt DESC);
CREATE INDEX IX_ImportSessions_FileName ON ImportSessions (FileName);
CREATE INDEX IX_ImportSessions_FileHash ON ImportSessions (FileHash);
GO

-- 2. Sheets Metadata Table
CREATE TABLE Sheets (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId UNIQUEIDENTIFIER NOT NULL,
    SheetName NVARCHAR(255) NOT NULL,
    SheetIndex INT NOT NULL, -- Original position in Excel file
    [RowCount] INT NOT NULL, -- RowCount is reserved, so use brackets
    [ColumnCount] INT NOT NULL, -- ColumnCount might be reserved too
    Headers NVARCHAR(MAX) NOT NULL, -- JSON array of column headers
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (SessionId) REFERENCES ImportSessions(Id) ON DELETE CASCADE
);
GO

-- Create indexes for Sheets
CREATE INDEX IX_Sheets_SessionId ON Sheets (SessionId);
CREATE INDEX IX_Sheets_SheetName ON Sheets (SessionId, SheetName);
GO

-- 3. Sheet Data Table (JSON storage for flexibility)
CREATE TABLE SheetData (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SheetId UNIQUEIDENTIFIER NOT NULL,
    [RowIndex] INT NOT NULL, -- RowIndex might be reserved
    RowData NVARCHAR(MAX) NOT NULL,
    RowHash AS CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', RowData), 2) PERSISTED,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (SheetId) REFERENCES Sheets(Id) ON DELETE CASCADE
);
GO

-- Add constraint to ensure RowData is valid JSON
ALTER TABLE SheetData ADD CONSTRAINT CK_SheetData_ValidJSON CHECK (ISJSON(RowData) > 0);
GO

-- Create indexes for SheetData
CREATE INDEX IX_SheetData_SheetId_RowIndex ON SheetData (SheetId, [RowIndex]);
CREATE INDEX IX_SheetData_RowHash ON SheetData (SheetId, RowHash);
GO

-- 4. Excluded Sheets Log
CREATE TABLE ExcludedSheets (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId UNIQUEIDENTIFIER NOT NULL,
    SheetName NVARCHAR(255) NOT NULL,
    ExclusionReason NVARCHAR(500),
    FOREIGN KEY (SessionId) REFERENCES ImportSessions(Id) ON DELETE CASCADE
);
GO

-- Create index for ExcludedSheets
CREATE INDEX IX_ExcludedSheets_SessionId ON ExcludedSheets (SessionId);
GO

-- 5. Processing Errors Table (for troubleshooting)
CREATE TABLE ProcessingErrors (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId UNIQUEIDENTIFIER,
    SheetName NVARCHAR(255),
    [RowIndex] INT, -- Use brackets for consistency
    ErrorMessage NVARCHAR(MAX),
    ErrorType NVARCHAR(100),
    OccurredAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (SessionId) REFERENCES ImportSessions(Id) ON DELETE CASCADE
);
GO

-- Create index for ProcessingErrors
CREATE INDEX IX_ProcessingErrors_SessionId ON ProcessingErrors (SessionId);
GO

-- Create Stored Procedures

-- SP: Insert Import Session
GO
CREATE PROCEDURE sp_InsertImportSession
    @FileName NVARCHAR(500),
    @FileHash NVARCHAR(64),
    @TotalSheets INT,
    @ProcessedSheets INT,
    @ExcludedSheets INT,
    @TotalRows INT,
    @ImportedBy NVARCHAR(255),
    @SessionId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @SessionId = NEWID();
    
    INSERT INTO ImportSessions (
        Id, FileName, FileHash, TotalSheets, 
        ProcessedSheets, ExcludedSheets, TotalRows, ImportedBy
    )
    VALUES (
        @SessionId, @FileName, @FileHash, @TotalSheets,
        @ProcessedSheets, @ExcludedSheets, @TotalRows, @ImportedBy
    );
END;
GO

-- Create User-Defined Table Type for Bulk Insert
CREATE TYPE SheetDataTableType AS TABLE (
    [RowIndex] INT,
    RowData NVARCHAR(MAX)
);
GO

-- SP: Bulk Insert Sheet Data (for performance)
CREATE PROCEDURE sp_BulkInsertSheetData
    @SheetId UNIQUEIDENTIFIER,
    @SheetData SheetDataTableType READONLY
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO SheetData (Id, SheetId, [RowIndex], RowData)
    SELECT NEWID(), @SheetId, [RowIndex], RowData
    FROM @SheetData;
END;
GO

-- SP: Get Session Data (optimized retrieval)
CREATE PROCEDURE sp_GetSessionData
    @SessionId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Get session info
    SELECT * FROM ImportSessions WHERE Id = @SessionId;
    
    -- Get sheets with data count
    SELECT 
        s.Id,
        s.SheetName,
        s.SheetIndex,
        s.[RowCount],
        s.[ColumnCount],
        s.Headers
    FROM Sheets s
    WHERE s.SessionId = @SessionId
    ORDER BY s.SheetIndex;
    
    -- Get excluded sheets
    SELECT SheetName, ExclusionReason
    FROM ExcludedSheets
    WHERE SessionId = @SessionId;
END;
GO

-- SP: Search across all data (using JSON functions)
CREATE PROCEDURE sp_SearchData
    @SearchTerm NVARCHAR(255),
    @SessionId UNIQUEIDENTIFIER = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        s.SheetName,
        sd.[RowIndex],
        sd.RowData,
        iss.FileName,
        iss.ImportedAt,
        iss.Id as SessionId
    FROM SheetData sd
    INNER JOIN Sheets s ON sd.SheetId = s.Id
    INNER JOIN ImportSessions iss ON s.SessionId = iss.Id
    WHERE 
        (@SessionId IS NULL OR iss.Id = @SessionId)
        AND sd.RowData LIKE '%' + @SearchTerm + '%'
    ORDER BY iss.ImportedAt DESC, s.SheetIndex, sd.[RowIndex]
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

-- Create view for recent sessions
CREATE VIEW vw_RecentSessions
AS
SELECT 
    iss.Id,
    iss.FileName,
    iss.ImportedAt,
    iss.TotalSheets,
    iss.ProcessedSheets,
    iss.TotalRows,
    COUNT(sd.Id) as RecordCount
FROM ImportSessions iss
LEFT JOIN Sheets s ON iss.Id = s.SessionId
LEFT JOIN SheetData sd ON s.Id = sd.SheetId
WHERE iss.ImportedAt > DATEADD(day, -30, GETDATE())
GROUP BY 
    iss.Id, 
    iss.FileName, 
    iss.ImportedAt, 
    iss.TotalSheets, 
    iss.ProcessedSheets, 
    iss.TotalRows;
GO

-- Insert sample data for testing
INSERT INTO ImportSessions (FileName, TotalSheets, ProcessedSheets, ExcludedSheets, TotalRows, ImportedBy)
VALUES ('sample_test.xlsx', 3, 3, 0, 25, 'System Test');

PRINT 'Database schema created successfully with proper square bracket escaping!';
PRINT 'Tables created: ImportSessions, Sheets, SheetData, ExcludedSheets, ProcessingErrors';
PRINT 'Stored procedures created: sp_InsertImportSession, sp_BulkInsertSheetData, sp_GetSessionData, sp_SearchData';
PRINT 'Views created: vw_RecentSessions';
PRINT 'All reserved keywords properly escaped with square brackets!';
PRINT 'Ready to use with your Excel Processor App!';
GO

