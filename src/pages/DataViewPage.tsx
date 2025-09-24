import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Eye, Search, Download, Trash2 } from 'lucide-react';
import { ApiService } from '../services/apiService';
import type { SessionData, SheetDetail } from '../services/apiService';
import DataTable from '../components/DataTable';
import type { ExcelSheetData } from '../types';
import './DataViewPage.css';

interface DataViewPageProps {
  sessionId: string;
  onBack: () => void;
}

const DataViewPage = ({ sessionId, onBack }: DataViewPageProps) => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentSheet, setCurrentSheet] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<ExcelSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  useEffect(() => {
    if (session && session.sheets.length > 0 && !currentSheet) {
      // Set the first sheet as active by default
      setCurrentSheet(session.sheets[0].id);
    }
  }, [session]);

  useEffect(() => {
    if (currentSheet) {
      loadSheetData(currentSheet);
    }
  }, [currentSheet]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sessionData = await ApiService.getSession(sessionId);
      setSession(sessionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load session data');
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSheetData = async (sheetId: string) => {
    try {
      setLoadingSheet(true);
      setError(null);
      
      const detail = await ApiService.getSheetDetail(sheetId);
      
      // Transform API data to match the DataTable expected format
      const transformedData: ExcelSheetData = {
        sheetName: detail.sheetName,
        headers: detail.headers,
        data: detail.data
      };
      
      setSheetData(transformedData);
    } catch (err: any) {
      setError(err.message || 'Failed to load sheet data');
      console.error('Error loading sheet data:', err);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleSheetSelect = (sheetId: string) => {
    setCurrentSheet(sheetId);
  };

  const handleDeleteSession = async () => {
    if (!session) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the session "${session.fileName}"?\n\nThis action cannot be undone and will permanently remove all associated data.`
    );
    
    if (confirmDelete) {
      try {
        await ApiService.deleteSession(sessionId);
        alert('Session deleted successfully!');
        onBack(); // Navigate back to sessions list
      } catch (err: any) {
        alert(`Error deleting session: ${err.message}`);
        console.error('Error deleting session:', err);
      }
    }
  };

  const exportSessionData = () => {
    if (!session || !sheetData) return;
    
    // Create JSON export of current sheet
    const exportData = {
      sessionInfo: {
        fileName: session.fileName,
        importedAt: session.importedAt,
        sessionId: session.id
      },
      sheetData: {
        sheetName: sheetData.sheetName,
        headers: sheetData.headers,
        data: sheetData.data,
        rowCount: sheetData.data.length
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${session.fileName}_${sheetData.sheetName}_export.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'processing': return 'status-processing';
      case 'failed': return 'status-failed';
      default: return 'status-unknown';
    }
  };

  // Mock data update handler (read-only for database view)
  const handleDataUpdate = (sheetName: string, rowIndex: number, header: string, value: any) => {
    // This is a read-only view, so we don't actually update anything
    // Could potentially add edit capabilities in the future
    console.log('Data update attempted on read-only view:', { sheetName, rowIndex, header, value });
  };

  if (loading) {
    return (
      <div className="data-view-page">
        <div className="data-view-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back to Sessions
          </button>
          <h1>📊 Loading Session Data...</h1>
        </div>
        <div className="loading-session">
          <div className="spinner"></div>
          <p>Loading stored Excel data...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="data-view-page">
        <div className="data-view-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back to Sessions
          </button>
          <h1>❌ Error Loading Data</h1>
        </div>
        <div className="error-message">
          <p>Error: {error || 'Session not found'}</p>
          <button onClick={loadSessionData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="data-view-page">
      <div className="data-view-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back to Sessions
        </button>
        <div className="session-info">
          <h1>📊 {session.fileName}</h1>
          <div className="session-meta">
            <div className={`session-status ${getStatusBadgeClass(session.status)}`}>
              {session.status}
            </div>
            <span className="import-date">Imported: {formatDate(session.importedAt)}</span>
          </div>
        </div>
        <div className="session-actions">
          {currentSheet && (
            <button onClick={exportSessionData} className="export-button">
              <Download size={16} />
              Export Current Sheet
            </button>
          )}
          <button onClick={handleDeleteSession} className="delete-button">
            <Trash2 size={16} />
            Delete Session
          </button>
        </div>
      </div>

      <div className="session-stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Sheets:</span>
          <span className="stat-value">{session.totalSheets}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Processed:</span>
          <span className="stat-value">{session.processedSheets}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Excluded:</span>
          <span className="stat-value">{session.excludedSheets}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Rows:</span>
          <span className="stat-value">{session.totalRows.toLocaleString()}</span>
        </div>
      </div>

      {session.sheets.length === 0 ? (
        <div className="no-sheets">
          <FileText size={64} className="no-sheets-icon" />
          <h3>No sheets found</h3>
          <p>This session doesn't contain any processed sheets.</p>
        </div>
      ) : (
        <>
          {/* Sheet Tabs */}
          <div className="sheet-tabs">
            <div className="sheet-tabs-container">
              {session.sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  className={`sheet-tab ${currentSheet === sheet.id ? 'active' : ''}`}
                  onClick={() => handleSheetSelect(sheet.id)}
                >
                  <FileText size={16} />
                  <span className="sheet-name">{sheet.sheetName}</span>
                  <span className="sheet-rows">({sheet.rowCount} rows)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          {loadingSheet ? (
            <div className="loading-sheet">
              <div className="spinner"></div>
              <p>Loading sheet data...</p>
            </div>
          ) : sheetData ? (
            <div className="data-table-container">
              <DataTable
                sheetData={sheetData}
                onDataUpdate={handleDataUpdate}
                isVisible={true}
              />
            </div>
          ) : (
            <div className="no-sheet-selected">
              <Eye size={48} />
              <p>Select a sheet to view its data</p>
            </div>
          )}
        </>
      )}

      {/* Excluded Sheets Info */}
      {session.excludedSheetsList && session.excludedSheetsList.length > 0 && (
        <div className="excluded-sheets-section">
          <h3>🚫 Excluded Sheets</h3>
          <div className="excluded-sheets-list">
            {session.excludedSheetsList.map((excludedSheet, index) => (
              <div key={index} className="excluded-sheet-item">
                <span className="excluded-sheet-name">{excludedSheet.sheetName}</span>
                {excludedSheet.exclusionReason && (
                  <span className="exclusion-reason">({excludedSheet.exclusionReason})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataViewPage;