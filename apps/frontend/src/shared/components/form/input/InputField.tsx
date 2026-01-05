import React, { forwardRef } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
  hideBorder?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    type = "text",
    id,
    name,
    placeholder,
    value,
    defaultValue,
    onChange,
    className = "",
    min,
    max,
    step,
    required = false,
    disabled = false,
    readOnly = false,
    success = false,
    error = false,
    hint,
    hideBorder = false,
    onFocus,
    onBlur,
    onKeyDown,
  },
  ref
) {
  // Determine input styles based on state (disabled, success, error)
  let inputClasses = `w-full rounded-lg border border-app bg-app-subtle appearance-none text-sm text-app placeholder:text-app-muted focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 focus:border-brand-300 ${className}`;

  if (hideBorder) {
    inputClasses += ` h-auto border-transparent bg-transparent px-0 py-0 shadow-none focus:ring-0 focus:border-transparent`;
  } else {
    inputClasses += ` h-11 px-4 py-2.5 shadow-theme-xs`;
  }

  // Add styles for the different states
  if (disabled) {
    inputClasses += hideBorder
      ? ` text-app-muted cursor-not-allowed`
      : ` text-app-muted cursor-not-allowed opacity-60`;
  } else if (error) {
    inputClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10`;
  } else if (success) {
    inputClasses += ` text-success-600 border-success-400 focus:ring-success-500/10 focus:border-success-300`;
  } else {
    inputClasses += hideBorder
      ? ` text-app`
      : ``;
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        suppressHydrationWarning
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        min={min}
        max={max}
        step={step}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        className={inputClasses}
      />

      {/* Optional Hint Text */}
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
