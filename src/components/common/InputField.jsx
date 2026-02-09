import React from 'react';

function InputField({ label, type = 'text', value, onChange, error, ...props }) {
  return (
    <div className="input-field">
      {label && <label>{label}</label>}
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        className={error ? 'error' : ''}
        {...props} 
      />
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export default InputField;
