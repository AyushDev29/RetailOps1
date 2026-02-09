import React from 'react';
import ExhibitionSalesForm from '../../components/forms/ExhibitionSalesForm';

function Exhibition() {
  return (
    <div className="exhibition">
      <h2>Exhibition Sales</h2>
      <ExhibitionSalesForm onSubmit={(data) => console.log(data)} />
    </div>
  );
}

export default Exhibition;
