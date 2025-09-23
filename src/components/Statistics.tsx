import type { Statistics as StatsType } from '../types';

interface StatisticsProps {
  stats: StatsType;
  isVisible: boolean;
}

const Statistics: React.FC<StatisticsProps> = ({ stats, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-label">Total Sheets</div>
        <div className="stat-value">{stats.totalSheets}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Processed Sheets</div>
        <div className="stat-value">{stats.processedSheets}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Excluded Sheets</div>
        <div className="stat-value">{stats.excludedSheets}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Rows</div>
        <div className="stat-value">{stats.totalRows}</div>
      </div>
    </div>
  );
};

export default Statistics;