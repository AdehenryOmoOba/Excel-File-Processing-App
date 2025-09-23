import * as XLSX from 'xlsx';
import type { ProcessedData } from '../types';

export class ExcelProcessorService {
  static async processFile(
    file: File,
    excludePatterns: string[]
  ): Promise<{
    processedData: ProcessedData;
    excludedSheets: Set<string>;
    workbook: XLSX.WorkBook;
  }> {
    const arrayBuffer = await file.arrayBuffer();
    // Enable cellDates to automatically parse Excel dates as JavaScript Date objects
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: true,
      dateNF: 'MM/DD/YYYY'
    });

    const processedData: ProcessedData = {};
    const excludedSheets = new Set<string>();

    // Process each sheet
    workbook.SheetNames.forEach((sheetName) => {
      // Check if sheet should be excluded
      const shouldExclude = excludePatterns.some((pattern) =>
        sheetName.toLowerCase().includes(pattern.toLowerCase())
      );

      if (shouldExclude) {
        excludedSheets.add(sheetName);
      } else {
        const worksheet = workbook.Sheets[sheetName];
        
        // Get sheet data with proper date formatting
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,  // This ensures dates are formatted
          dateNF: 'MM/DD/YYYY'
        }) as any[][];

        if (jsonData.length > 0) {
          // Extract headers from first row
          const headers = jsonData[0].map((header, index) =>
            header || `Column_${index + 1}`
          );

          // Convert remaining rows to objects
          const rows = jsonData.slice(1).map((row) => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
              let value = row[index];
              
              // Check if value is a Date object and format it
              if (value instanceof Date) {
                const month = String(value.getMonth() + 1).padStart(2, '0');
                const day = String(value.getDate()).padStart(2, '0');
                const year = value.getFullYear();
                value = `${month}/${day}/${year}`;
              } else if (typeof value === 'string') {
                // Clean up double dollar signs (Excel sometimes adds currency formatting)
                value = value.replace(/^\$\$/, '$');
                // Also handle any other double currency symbols
                value = value.replace(/\$\s*\$/, '$');
              }
              
              // If value is empty, null, or undefined, set it to 'N/A'
              if (value === '' || value === null || value === undefined) {
                value = 'N/A';
              }
              
              obj[header] = value;
            });
            return obj;
          });

          processedData[sheetName] = {
            sheetName,
            headers,
            data: rows,
          };
        }
      }
    });

    return { processedData, excludedSheets, workbook };
  }

  static exportToJSON(data: ProcessedData, excludedSheets: Set<string>): void {
    const payload = {
      metadata: {
        exportedAt: new Date().toISOString(),
        excludedSheets: Array.from(excludedSheets),
      },
      sheets: data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `excel_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}