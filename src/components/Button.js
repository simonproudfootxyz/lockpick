import React from "react";
import "./Button.css";

const Button = ({
  className = "",
  type = "button",
  onClick,
  title,
  disabled = false,
  children,
  mini = false,
  fullWidth = false,
}) => {
  return (
    <button
      type={type}
      className={`button ${mini ? "button--mini " : ""} ${
        fullWidth ? "button--full-width" : ""
      } ${className}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const InvertButton = ({
  className = "",
  type = "button",
  onClick,
  title,
  disabled = false,
  mini = false,
  children,
  fullWidth = false,
}) => {
  return (
    <Button
      type={type}
      className={`button button--invert ${mini ? "button--mini " : ""} ${
        fullWidth ? "button--full-width" : ""
      } ${className}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};

export const PrimaryButton = ({
  className = "",
  type = "button",
  onClick,
  title,
  disabled = false,
  children,
  mini = false,
  fullWidth = false,
}) => {
  return (
    <Button
      type={type}
      className={`button button--primary ${className}`}
      mini={mini}
      fullWidth={fullWidth}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};

export const PrimaryInvertButton = ({
  className = "",
  type = "button",
  onClick,
  title,
  disabled = false,
  children,
  mini = false,
  fullWidth = false,
}) => {
  return (
    <Button
      type={type}
      className={`button button--primary-invert ${className}`}
      mini={mini}
      fullWidth={fullWidth}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};

export default Button;
