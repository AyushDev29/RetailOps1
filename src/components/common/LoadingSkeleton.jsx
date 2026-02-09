import './LoadingSkeleton.css';

/**
 * Loading skeleton component for better UX during data fetching
 */
function LoadingSkeleton({ type = 'card', count = 1 }) {
  if (type === 'stats-grid') {
    return (
      <div className="skeleton-stats-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-icon" />
            <div className="skeleton-content">
              <div className="skeleton-text skeleton-text-sm" />
              <div className="skeleton-text skeleton-text-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="skeleton-chart">
        <div className="skeleton-text skeleton-text-md" style={{ width: '40%', marginBottom: '16px' }} />
        <div className="skeleton-chart-content" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-text skeleton-text-sm" />
          ))}
        </div>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="skeleton-table-row">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="skeleton-text skeleton-text-sm" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className="skeleton-card">
      <div className="skeleton-text skeleton-text-lg" />
      <div className="skeleton-text skeleton-text-md" />
      <div className="skeleton-text skeleton-text-sm" />
    </div>
  );
}

export default LoadingSkeleton;
