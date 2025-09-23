import { Settings } from 'lucide-react';

interface ConfigurationProps {
  isVisible: boolean;
  exclusionPatterns: string;
  onExclusionPatternsChange: (value: string) => void;
  onApplyFilter: () => void;
}

const Configuration: React.FC<ConfigurationProps> = ({
  isVisible,
  exclusionPatterns,
  onExclusionPatternsChange,
  onApplyFilter,
}) => {
  if (!isVisible) return null;

  return (
    <div className="config-section">
      <div className="config-header">
        <Settings size={20} color="#7C8ADB" />
        <h3>Configuration</h3>
      </div>
      <label className="config-label">
        Exclude tabs containing these names (comma-separated):
      </label>
      <input
        type="text"
        className="exclusion-input"
        placeholder="e.g., Summary, Template"
        value={exclusionPatterns}
        onChange={(e) => onExclusionPatternsChange(e.target.value)}
      />
      <button className="apply-filter-btn" onClick={onApplyFilter}>
        Apply Filter & Process
      </button>
    </div>
  );
};

export default Configuration;