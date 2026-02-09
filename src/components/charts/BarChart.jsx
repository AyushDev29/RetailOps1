import React from 'react';
import './BarChart.css';

function BarChart({ data }) {
  if (!data || !data.labels || !data.values) {
    return <div className="chart-empty">No data available</div>;
  }
  
  const maxValue = Math.max(...data.values, 1);
  
  return (
    <div className="bar-chart">
      {data.labels.map((label, index) => {
        const value = data.values[index];
        const percentage = (value / maxValue) * 100;
        
        return (
          <div key={index} className="bar-item">
            <div className="bar-label">{label}</div>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{ width: `${percentage}%` }}
              >
                <span className="bar-value">{value}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BarChart;
