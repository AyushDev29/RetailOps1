import React from 'react';

function DatePicker({ label, value, onChange, ...props }) {
  return (
    <div className="date-picker">
      {label && <label>{label}</label>}
      <input type="date" value={value} onChange={onChange} {...props} />
    </div>
  );
}

export default DatePicker;
