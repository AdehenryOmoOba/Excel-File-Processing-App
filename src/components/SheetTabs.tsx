import { FileSpreadsheet } from 'lucide-react';

interface SheetTabsProps {
  sheetNames: string[];
  currentSheet: string | null;
  excludedSheets: Set<string>;
  onSheetSelect: (sheetName: string) => void;
  isVisible: boolean;
}

const SheetTabs: React.FC<SheetTabsProps> = ({
  sheetNames,
  currentSheet,
  excludedSheets,
  onSheetSelect,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="sheet-tabs-section">
      <div className="sheet-tabs-header">
        <FileSpreadsheet size={20} color="#7C8ADB" />
        <h3>Sheet Tabs</h3>
      </div>
      <div className="tabs-container">
        {sheetNames
          .filter((sheetName) => !excludedSheets.has(sheetName))
          .map((sheetName) => {
            const isActive = currentSheet === sheetName;

            return (
              <button
                key={sheetName}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => onSheetSelect(sheetName)}
              >
                {sheetName}
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default SheetTabs;