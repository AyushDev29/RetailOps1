import React, { useState } from 'react';
import InputField from '../common/InputField';
import Button from '../common/Button';

function PreBookingForm({ onSubmit }) {
  const [formData, setFormData] = useState({});

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <InputField label="Customer Name" />
      <InputField label="Booking Amount" type="number" />
      <Button type="submit">Submit</Button>
    </form>
  );
}

export default PreBookingForm;
