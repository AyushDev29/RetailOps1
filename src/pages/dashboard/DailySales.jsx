import React from 'react';
import DailySalesForm from '../../components/forms/DailySalesForm';

function DailySales() {
  return (
    <div className="daily-sales">
      <h2>Daily Sales</h2>
      <DailySalesForm onSubmit={(data) => console.log(data)} />
    </div>
  );
}

export default DailySales;
