import React from 'react';

function SelectDropdown({ label, options, value, onChange, ...props }) {
  return (
    <div className="select-dropdown">
      {label && <label>{label}</label>}
      <select value={value} onChange={onChange} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default SelectDropdown;
