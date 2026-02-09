import React, { useState } from 'react';
import InputField from '../common/InputField';
import Button from '../common/Button';

function ExhibitionSalesForm({ onSubmit }) {
  const [formData, setFormData] = useState({});

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <InputField label="Exhibition Name" />
      <InputField label="Sales Amount" type="number" />
      <Button type="submit">Submit</Button>
    </form>
  );
}

export default ExhibitionSalesForm;
