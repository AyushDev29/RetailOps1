import React from 'react';
import './LineChart.css';

function LineChart({ data }) {
  if (!data || !data.labels || !data.values) {
    return <div className="chart-empty">No data available</div>;
  }

  const maxValue = Math.max(...data.values, 1);
  const minValue = Math.min(...data.values, 0);
  const range = maxValue - minValue || 1;

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

        {/* Data points */}
        {data.values.map((value, index) => {
          const x = (index / (data.values.length - 1)) * 800;
          const y = 300 - ((value - minValue) / range) * 280;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill="#007bff"
            />
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
