import React from 'react';

function ChartWrapper({ title, children }) {
  return (
    <div className="chart-wrapper">
      <h3>{title}</h3>
      <div className="chart-content">{children}</div>
    </div>
  );
}

export default ChartWrapper;
