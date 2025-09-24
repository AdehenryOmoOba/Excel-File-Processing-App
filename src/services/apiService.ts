// API Service for communicating with the ASP.NET Core backend
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api'; // Update this to match your backend URL

// Fallback mode for development when backend is not running
const ENABLE_FALLBACK_MODE = false; // Database is now working!

// API Response types
export interface UploadResponse {
  sessionId: string;
  message: string;
  processedSheets: number;
  totalRows: number;
  excludedSheets: number;
  processingTime: string; // TimeSpan as string
}

export interface SessionData {
  id: string;
  fileName: string;
  importedAt: string;
  totalSheets: number;
  processedSheets: number;
  excludedSheets: number;
  totalRows: number;
  status: string;
  sheets: SheetSummary[];
  excludedSheetsList: ExcludedSheet[];
}

export interface SheetSummary {
  id: string;
  sheetName: string;
  sheetIndex: number;
  rowCount: number;
  columnCount: number;
  headers: string[];
}

export interface ExcludedSheet {
  sheetName: string;
  exclusionReason?: string;
}

export interface SheetDetail {
  id: string;
  sheetName: string;
  sheetIndex: number;
  headers: string[];
  data: Record<string, any>[];
}

export interface SessionList {
  id: string;
  fileName: string;
  importedAt: string;
  totalSheets: number;
  processedSheets: number;
  totalRows: number;
  status: string;
}

export interface PagedResponse<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchResult {
  sheetName: string;
  rowIndex: number;
  rowData: Record<string, any>;
  fileName: string;
  importedAt: string;
  sessionId: string;
}

export interface ErrorResponse {
  message: string;
  details?: string;
  errors: string[];
  timestamp: string;
}

// Upload payload that matches the backend DTO
export interface ExcelUploadPayload {
  fileName: string;
  importedBy?: string;
  metadata: {
    exportedAt: string;
    excludedSheets: string[];
  };
  sheets: Record<string, {
    sheetName: string;
    headers: string[];
    data: Record<string, any>[];
  }>;
}

// Configure axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for large uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Handle authentication errors
      console.error('Authentication required');
    } else if (error.response?.status === 403) {
      // Handle authorization errors
      console.error('Access forbidden');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error occurred');
    }
    
    return Promise.reject(error);
  }
);

export class ApiService {
  /**
   * Uploads Excel data to the database
   */
  static async uploadExcelData(payload: ExcelUploadPayload): Promise<UploadResponse> {
    // Fallback for development when backend is not available
    if (ENABLE_FALLBACK_MODE) {
      console.log('Fallback mode: Simulating Excel data upload for:', payload.fileName);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
      
      const mockResponse: UploadResponse = {
        sessionId: 'mock-session-' + Math.random().toString(36).substr(2, 9),
        message: 'Data saved successfully (fallback mode - no backend)',
        processedSheets: Object.keys(payload.sheets).length,
        totalRows: Object.values(payload.sheets).reduce((sum, sheet) => sum + sheet.data.length, 0),
        excludedSheets: payload.metadata.excludedSheets.length,
        processingTime: '00:00:01.500'
      };
      
      return mockResponse;
    }
    
    try {
      console.log('Uploading Excel data:', payload.fileName);
      const response = await apiClient.post('/excel/upload', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error uploading Excel data:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Retrieves all import sessions with pagination
   */
  static async getSessions(pageNumber: number = 1, pageSize: number = 20): Promise<PagedResponse<SessionList>> {
    try {
      const response = await apiClient.get('/excel/sessions', {
        params: { pageNumber, pageSize }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error retrieving sessions:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Retrieves a specific import session by ID
   */
  static async getSession(sessionId: string): Promise<SessionData> {
    try {
      const response = await apiClient.get(`/excel/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error retrieving session:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Retrieves detailed data for a specific sheet
   */
  static async getSheetDetail(sheetId: string): Promise<SheetDetail> {
    try {
      const response = await apiClient.get(`/excel/sheets/${sheetId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error retrieving sheet detail:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Searches data across all sessions
   */
  static async searchData(searchTerm: string, sessionId?: string, pageNumber: number = 1, pageSize: number = 50): Promise<PagedResponse<SearchResult>> {
    try {
      const response = await apiClient.post('/excel/search', {
        searchTerm,
        sessionId,
        pageNumber,
        pageSize
      });
      return response.data;
    } catch (error: any) {
      console.error('Error searching data:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Deletes an import session and all its data
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      await apiClient.delete(`/excel/sessions/${sessionId}`);
    } catch (error: any) {
      console.error('Error deleting session:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    try {
      const response = await apiClient.get('/excel/health');
      return response.data;
    } catch (error: any) {
      console.error('Error checking API health:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Handles API errors and provides user-friendly messages
   */
  private static handleApiError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const errorData: ErrorResponse = error.response.data;
      const message = errorData?.message || `Server error: ${error.response.status}`;
      return new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('No response from server. Please check your connection and try again.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Transforms processed data from the frontend to the backend upload format
   */
  static transformToUploadPayload(
    fileName: string,
    processedData: Record<string, any>,
    excludedSheets: Set<string>,
    importedBy?: string
  ): ExcelUploadPayload {
    return {
      fileName,
      importedBy,
      metadata: {
        exportedAt: new Date().toISOString(),
        excludedSheets: Array.from(excludedSheets),
      },
      sheets: Object.fromEntries(
        Object.entries(processedData).map(([sheetName, sheetData]: [string, any]) => [
          sheetName,
          {
            sheetName,
            headers: sheetData.headers || [],
            data: sheetData.data || [],
          },
        ])
      ),
    };
  }
}

export default ApiService;