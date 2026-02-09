import './LineChart.css';

function LineChart({ data, anomalies = [] }) {
  if (!data || !data.labels || !data.values) {
    return <div className="chart-empty">No data available</div>;
  }

  const maxValue = Math.max(...data.values, 1);
  const minValue = Math.min(...data.values, 0);
  const range = maxValue - minValue || 1;

  // Create anomaly index map for quick lookup
  const anomalyMap = {};
  anomalies.forEach(anomaly => {
    const index = data.labels.indexOf(anomaly.date);
    if (index !== -1) {
      anomalyMap[index] = anomaly;
    }
  });

  return (
    <div className="line-chart">
      <svg viewBox="0 0 800 300" className="line-chart-svg">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1="0"
            y1={60 * i}
            x2="800"
            y2={60 * i}
            stroke="#e9ecef"
            strokeWidth="1"
          />
        ))}

        {/* Line path */}
        <polyline
          points={data.values
            .map((value, index) => {
              const x = (index / (data.values.length - 1)) * 800;
              const y = 300 - ((value - minValue) / range) * 280;
              return `${x},${y}`;
            })
            .join(' ')}
          fill="none"
          stroke="#007bff"
          strokeWidth="3"
        />

        {/* Data points with anomaly highlighting */}
        {data.values.map((value, index) => {
          const x = (index / (data.values.length - 1)) * 800;
          const y = 300 - ((value - minValue) / range) * 280;
          const isAnomaly = anomalyMap[index];
          
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r={isAnomaly ? "6" : "4"}
                fill={isAnomaly ? (isAnomaly.type === 'spike' ? '#28a745' : '#dc3545') : '#007bff'}
              />
              {isAnomaly && (
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fontSize="16"
                >
                  {isAnomaly.type === 'spike' ? '📈' : '📉'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="line-chart-labels">
        {data.labels.filter((_, i) => i % 5 === 0).map((label, index) => (
          <span key={index} className="chart-label">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default LineChart;
