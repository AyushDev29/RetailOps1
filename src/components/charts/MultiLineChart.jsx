import './MultiLineChart.css';

const COLORS = ['#007bff', '#28a745', '#ffc107'];

function MultiLineChart({ data }) {
  if (!data || !data.labels || !data.series || data.series.length === 0) {
    return <div className="chart-empty">No product performance data available</div>;
  }

  // Find max value across all series
  const allValues = data.series.flatMap(s => s.data);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;

  return (
    <div className="multi-line-chart">
      <svg viewBox="0 0 800 300" className="multi-line-chart-svg">
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

        {/* Draw line for each product */}
        {data.series.map((series, seriesIndex) => {
          const color = COLORS[seriesIndex % COLORS.length];
          
          return (
            <g key={seriesIndex}>
              {/* Line path */}
              <polyline
                points={series.data
                  .map((value, index) => {
                    const x = (index / (series.data.length - 1)) * 800;
                    const y = 300 - ((value - minValue) / range) * 280;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />

              {/* Data points */}
              {series.data.map((value, index) => {
                const x = (index / (series.data.length - 1)) * 800;
                const y = 300 - ((value - minValue) / range) * 280;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={color}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* X-axis labels */}
      <div className="multi-line-chart-labels">
        {data.labels.filter((_, i) => i % 5 === 0).map((label, index) => (
          <span key={index} className="chart-label">
            {label}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {data.series.map((series, index) => (
          <div key={index} className="legend-item">
            <span 
              className="legend-color" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="legend-label">{series.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MultiLineChart;
