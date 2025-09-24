import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { ExcelSheetData } from '../types';

interface DataTableProps {
  sheetData: ExcelSheetData | null;
  onDataUpdate: (sheetName: string, rowIndex: number, header: string, value: any) => void;
  isVisible: boolean;
}

const DataTable: React.FC<DataTableProps> = ({ sheetData, onDataUpdate, isVisible }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<Record<string, any>[]>([]);
  
  const rowsPerPage = 25;

  // Calculate column widths based on content
  const columnWidths = useMemo(() => {
    if (!sheetData) return {};
    
    const widths: Record<string, number> = {};
    
    // Start with header lengths
    sheetData.headers.forEach((header) => {
      widths[header] = header.length;
    });
    
    // Check all data to find maximum length for each column
    sheetData.data.forEach((row) => {
      sheetData.headers.forEach((header) => {
        const value = String(row[header] || '');
        if (value.length > widths[header]) {
          widths[header] = value.length;
        }
      });
    });
    
    // Convert to pixel widths (approximate 8px per character, with min and max)
    const pixelWidths: Record<string, string> = {};
    sheetData.headers.forEach((header) => {
      const charWidth = widths[header];
      // Minimum 60px, maximum 300px, approximately 8px per character
      const width = Math.min(Math.max(charWidth * 8 + 20, 60), 300);
      pixelWidths[header] = `${width}px`;
    });
    
    return pixelWidths;
  }, [sheetData]);

  useEffect(() => {
    if (sheetData) {
      // Filter data based on search query
      if (searchQuery.trim() === '') {
        // No search query, show all data
        setFilteredData(sheetData.data);
      } else {
        // Apply search filter
        const filtered = sheetData.data.filter((row) =>
          Object.values(row).some((value) =>
            String(value).toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
        setFilteredData(filtered);
      }
    }
  }, [sheetData, searchQuery]); // Re-filter when either sheetData or searchQuery changes

  useEffect(() => {
    // Reset to first page only when search query changes or switching sheets
    setCurrentPage(1);
  }, [searchQuery, sheetData?.sheetName]);

  if (!isVisible || !sheetData) return null;

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageData = filteredData.slice(startIndex, endIndex);

  const handleCellEdit = (
    rowIndex: number,
    header: string,
    value: string
  ) => {
    const actualIndex = startIndex + rowIndex;
    const originalIndex = sheetData.data.indexOf(filteredData[actualIndex]);
    if (originalIndex !== -1) {
      // If the field is emptied, replace with 'N/A'
      const finalValue = value.trim() === '' ? 'N/A' : value;
      
      // Update the parent data
      onDataUpdate(sheetData.sheetName, originalIndex, header, finalValue);
      
      // Update filtered data locally to maintain search context
      if (searchQuery.trim() !== '') {
        // If there's an active search, update the filtered data to reflect the change
        const updatedFilteredData = [...filteredData];
        updatedFilteredData[actualIndex] = {
          ...updatedFilteredData[actualIndex],
          [header]: finalValue
        };
        setFilteredData(updatedFilteredData);
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="data-table-section">
      <div className="table-header">
        <div className="table-title">
          <FileText size={20} color="#7C8ADB" />
          <h3>{sheetData.sheetName} ({filteredData.length} rows)</h3>
        </div>
        <div className="table-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search rows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-info">
              Page {currentPage} / {totalPages || 1}
            </span>
            <button 
              className="pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {sheetData.headers.map((header, index) => (
                <th 
                  key={index}
                  style={{ 
                    width: columnWidths[header],
                    minWidth: columnWidths[header]
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentPageData.length === 0 ? (
              <tr>
                <td colSpan={sheetData.headers.length} className="no-data">
                  No data found
                </td>
              </tr>
            ) : (
              currentPageData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {sheetData.headers.map((header, colIndex) => (
                    <td 
                      key={colIndex}
                      style={{ 
                        width: columnWidths[header],
                        minWidth: columnWidths[header]
                      }}
                    >
                      <input
                        type="text"
                        className="cell-input"
                        value={row[header] !== null && row[header] !== undefined ? String(row[header]) : 'N/A'}
                        title={row[header] !== null && row[header] !== undefined ? String(row[header]) : 'N/A'}
                        onChange={(e) =>
                          handleCellEdit(rowIndex, header, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;