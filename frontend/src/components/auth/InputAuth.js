import React from "react";

const InputAuth = ({ type, placeholder, name, iconClass, value, onChange }) => {
  return (
    <div className="input-container">
      <input 
        type={type} 
        placeholder={placeholder} 
        name={name} 
        className={name} 
        value={value} 
        onChange={onChange} 
        required 
      />
      <span className="icon">
        <i className={iconClass} aria-hidden="true"></i>
      </span>
    </div>
  );
};

export default InputAuth;
