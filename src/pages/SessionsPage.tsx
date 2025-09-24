import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, FileText, Database, Eye } from 'lucide-react';
import { ApiService } from '../services/apiService';
import type { SessionList, PagedResponse } from '../services/apiService';
import './SessionsPage.css';

interface SessionsPageProps {
  onBack: () => void;
  onViewSession: (sessionId: string) => void;
}

const SessionsPage = ({ onBack, onViewSession }: SessionsPageProps) => {
  const [sessions, setSessions] = useState<SessionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadSessions();
  }, [currentPage]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: PagedResponse<SessionList> = await ApiService.getSessions(currentPage, pageSize);
      
      setSessions(response.data);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
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

  if (loading && sessions.length === 0) {
    return (
      <div className="sessions-page">
        <div className="sessions-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back to Upload
          </button>
          <h1>📊 Stored Excel Data</h1>
          <p>Loading sessions...</p>
        </div>
        <div className="loading-sessions">
          <div className="spinner"></div>
          <p>Loading stored Excel sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back to Upload
        </button>
        <h1>📊 Stored Excel Data</h1>
        <p>Select a session to view the stored data and verify accuracy</p>
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={loadSessions} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {sessions.length === 0 && !loading ? (
        <div className="no-sessions">
          <Database size={64} className="no-sessions-icon" />
          <h3>No stored sessions found</h3>
          <p>Upload and save some Excel files first to see them here.</p>
        </div>
      ) : (
        <>
          <div className="sessions-grid">
            {sessions.map((session) => (
              <div key={session.id} className="session-card">
                <div className="session-header">
                  <div className="session-icon">
                    <FileText size={24} />
                  </div>
                  <div className="session-info">
                    <h3 className="session-filename">{session.fileName}</h3>
                    <div className={`session-status ${getStatusBadgeClass(session.status)}`}>
                      {session.status}
                    </div>
                  </div>
                </div>

                <div className="session-stats">
                  <div className="stat">
                    <span className="stat-label">Sheets:</span>
                    <span className="stat-value">{session.processedSheets}/{session.totalSheets}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Rows:</span>
                    <span className="stat-value">{session.totalRows.toLocaleString()}</span>
                  </div>
                </div>

                <div className="session-date">
                  <Calendar size={16} />
                  <span>{formatDate(session.importedAt)}</span>
                </div>

                <button 
                  onClick={() => onViewSession(session.id)}
                  className="view-session-button"
                >
                  <Eye size={16} />
                  View Data
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          )}

          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SessionsPage;