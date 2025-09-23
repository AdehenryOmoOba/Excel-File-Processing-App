export interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  data: Record<string, any>[];
}

export interface ProcessedData {
  [sheetName: string]: ExcelSheetData;
}

export interface Statistics {
  totalSheets: number;
  processedSheets: number;
  excludedSheets: number;
  totalRows: number;
}

export interface SheetTabProps {
  name: string;
  isActive: boolean;
  isExcluded: boolean;
  onClick: () => void;
}

export interface PaginationState {
  currentPage: number;
  rowsPerPage: number;
  totalRows: number;
}

export interface SaveDataPayload {
  sheets: ProcessedData;
  metadata: {
    timestamp: string;
    totalSheets: number;
    excludedSheets: string[];
  };
}