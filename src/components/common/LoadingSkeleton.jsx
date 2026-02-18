import './LoadingSkeleton.css';

/**
 * Loading skeleton component for better UX during data fetching
 */
function LoadingSkeleton({ type = 'fullscreen', count = 1 }) {
  // Full-screen branded loader
  if (type === 'fullscreen') {
    return (
      <div className="loading-fullscreen">
        <div className="loading-brand">
          <div className="loading-logo">
            <div className="logo-circle">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
          </div>
          <h2 className="loading-title">RetailOps</h2>
          <div className="loading-spinner-modern">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">Loading your workspace...</p>
        </div>
      </div>
    );
  }

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
