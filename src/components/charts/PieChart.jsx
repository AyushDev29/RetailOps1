import React from 'react';
import './PieChart.css';

function PieChart({ data }) {
  if (!data || !data.labels || !data.values) {
    return <div className="chart-empty">No data available</div>;
  }
  
  const total = data.values.reduce((sum, val) => sum + val, 0);
  
  if (total === 0) {
    return <div className="chart-empty">No data available</div>;
  }
  
  const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'];
  
  return (
    <div className="pie-chart">
      <div className="pie-legend">
        {data.labels.map((label, index) => {
          const value = data.values[index];
          const percentage = ((value / total) * 100).toFixed(1);
          
          return (
            <div key={index} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="legend-text">
                <span className="legend-label">{label}</span>
                <span className="legend-value">{value} ({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PieChart;
