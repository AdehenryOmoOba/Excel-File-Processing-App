import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isVisible: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isVisible }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`upload-section ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload size={48} color="#7C8ADB" strokeWidth={2} />
      <h3>Drop your Excel file here or click to browse</h3>
      <p className="file-types">Supports .xlsx, .xls, .csv files</p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileInput}
        className="file-input"
      />
      <button 
        className="choose-file-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        Choose File
      </button>
    </div>
  );
};

export default FileUploader;