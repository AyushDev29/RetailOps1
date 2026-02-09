import React from 'react';

function FormBuilder({ fields, onSubmit, formData, setFormData }) {
  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  return (
    <form onSubmit={onSubmit}>
      {fields.map((field) => (
        <div key={field.name}>
          {/* Render field based on type */}
        </div>
      ))}
    </form>
  );
}

export default FormBuilder;
