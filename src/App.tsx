import { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';
import './App.css';

// Components
import FileUploader from './components/FileUploader';
import Statistics from './components/Statistics';
import SheetTabs from './components/SheetTabs';
import DataTable from './components/DataTable';
import ActionButtons from './components/ActionButtons';

// Services & Types
import { ExcelProcessorService } from './services/excelService';
import type { ProcessedData, Statistics as StatsType } from './types';

function App() {
  // State Management
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData>({});
  const [excludedSheets, setExcludedSheets] = useState<Set<string>>(new Set());
  const [currentSheet, setCurrentSheet] = useState<string | null>(null);
  const [exclusionPatterns, setExclusionPatterns] = useState('Summary, Template');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showData, setShowData] = useState(false);

  // Calculate statistics
  const getStatistics = (): StatsType => {
    const processedSheetCount = Object.keys(processedData).length;
    const totalRows = Object.values(processedData).reduce(
      (sum, sheet) => sum + sheet.data.length,
      0
    );

    return {
      totalSheets: workbook?.SheetNames.length || 0,
      processedSheets: processedSheetCount,
      excludedSheets: excludedSheets.size,
      totalRows,
    };
  };

  // Handle file selection
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    
    // Process file immediately with pre-configured exclusions
    processFile(selectedFile);
  };

  // Process Excel file
  const processFile = async (fileToProcess?: File) => {
    const targetFile = fileToProcess || file;
    if (!targetFile) return;

    setIsLoading(true);
    try {
      const patterns = exclusionPatterns
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p);

      const result = await ExcelProcessorService.processFile(targetFile, patterns);
      
      setWorkbook(result.workbook);
      setProcessedData(result.processedData);
      setExcludedSheets(result.excludedSheets);

      // Set first available sheet as current
      const firstSheet = Object.keys(result.processedData)[0];
      if (firstSheet) {
        setCurrentSheet(firstSheet);
      }

      setShowData(true);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle data update
  const handleDataUpdate = (sheetName: string, rowIndex: number, header: string, value: any) => {
    setProcessedData((prev) => {
      const newData = { ...prev };
      if (newData[sheetName]) {
        newData[sheetName] = {
          ...newData[sheetName],
          data: newData[sheetName].data.map((row, idx) =>
            idx === rowIndex ? { ...row, [header]: value } : row
          ),
        };
      }
      return newData;
    });
  };

  // Save to database
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      const payload = {
        sheets: processedData,
        metadata: {
          timestamp: new Date().toISOString(),
          totalSheets: Object.keys(processedData).length,
          excludedSheets: Array.from(excludedSheets),
        },
      };

      // Simulate API call (replace with actual API endpoint)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Data to save:', payload);
      
      // In production, you would make an actual API call:
      // await axios.post('http://localhost:5001/api/excel/save', payload);
      
      alert('Data saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export to JSON
  const handleExportJSON = () => {
    ExcelProcessorService.exportToJSON(processedData, excludedSheets);
  };

  // Reset application
  const handleReset = () => {
    setFile(null);
    setWorkbook(null);
    setProcessedData({});
    setExcludedSheets(new Set());
    setCurrentSheet(null);
    setShowData(false);
    // Keep exclusion patterns for next upload
  };

  const currentSheetData = currentSheet ? processedData[currentSheet] : null;

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="header-icon">
            <FileSpreadsheet size={40} color="white" />
          </div>
          <h1>Excel File Processor</h1>
          <p>Upload, Process, Preview & Save Excel Data</p>
        </div>

        <div className="content">
          {!file && (
            <>
              <div className="pre-upload-config">
                <div className="config-header">
                  <h3>📋 Step 1: Configure Exclusion Rules</h3>
                  <p>Specify sheet names to exclude BEFORE uploading for better efficiency</p>
                </div>
                <input
                  type="text"
                  className="exclusion-input"
                  placeholder="Enter sheet names to exclude (comma-separated). e.g., Summary, Template"
                  value={exclusionPatterns}
                  onChange={(e) => setExclusionPatterns(e.target.value)}
                />
                <div className="config-note">
                  Sheets containing these names will be skipped during processing
                </div>
              </div>

              <div className="upload-divider">
                <h3>📤 Step 2: Upload Your Excel File</h3>
              </div>
              
              <FileUploader 
                onFileSelect={handleFileSelect}
                isVisible={true}
              />
            </>
          )}

          {isLoading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Processing your file...</p>
            </div>
          )}

          <Statistics 
            stats={getStatistics()}
            isVisible={showData}
          />

          <SheetTabs
            sheetNames={workbook?.SheetNames || []}
            currentSheet={currentSheet}
            excludedSheets={excludedSheets}
            onSheetSelect={setCurrentSheet}
            isVisible={showData}
          />

          <DataTable
            sheetData={currentSheetData}
            onDataUpdate={handleDataUpdate}
            isVisible={showData}
          />

          <ActionButtons
            onSaveToDatabase={handleSaveToDatabase}
            onExportJSON={handleExportJSON}
            onUploadNewFile={handleReset}
            isVisible={showData}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
}

export default App
