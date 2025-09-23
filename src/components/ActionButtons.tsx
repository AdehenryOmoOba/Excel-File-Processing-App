import { Save, Download, RefreshCw } from 'lucide-react';

interface ActionButtonsProps {
  onSaveToDatabase: () => void;
  onExportJSON: () => void;
  onUploadNewFile: () => void;
  isVisible: boolean;
  isSaving?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSaveToDatabase,
  onExportJSON,
  onUploadNewFile,
  isVisible,
  isSaving = false,
}) => {
  if (!isVisible) return null;

  return (
    <div className="action-buttons">
      <button 
        className="btn btn-success"
        onClick={onSaveToDatabase}
        disabled={isSaving}
      >
        <Save size={18} />
        {isSaving ? 'Saving...' : 'Save to Database'}
      </button>
      <button 
        className="btn btn-warning"
        onClick={onExportJSON}
      >
        <Download size={18} />
        Export as JSON
      </button>
      <button 
        className="btn btn-primary"
        onClick={onUploadNewFile}
      >
        <RefreshCw size={18} />
        Upload New File
      </button>
    </div>
  );
};

export default ActionButtons;