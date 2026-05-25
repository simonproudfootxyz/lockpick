import React from "react";
import "./Toggle.css";

const Toggle = ({
  id,
  name,
  value,
  type = "checkbox",
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  label,
  className = "",
}) => {
  const inputId =
    id || `toggle-${name || Math.random().toString(36).slice(2)}`;

  return (
    <label
      htmlFor={inputId}
      className={`toggle ${disabled ? "toggle--disabled" : ""} ${className}`}
    >
      <input
        id={inputId}
        name={name}
        value={value}
        type={type}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        className="toggle__input"
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      {label && <span className="toggle__label">{label}</span>}
    </label>
  );
};

export default Toggle;
