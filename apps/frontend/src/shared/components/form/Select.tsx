import React, { useState } from "react";
import { ChevronDownIcon } from "@/shared/icons";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  placeholderValue?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
  value,
  disabled = false,
  placeholderValue = "",
}) => {
  // Manage the selected value
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value); // Trigger parent handler
  };

  return (
    <div className="relative w-full">
      <select
        className={`h-11 w-full appearance-none rounded-lg border border-app bg-app-subtle px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-app-muted focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 ${
          selectedValue && selectedValue !== placeholderValue ? "text-app" : "text-app-muted"
        } ${className}`.trim()}
        value={selectedValue}
        onChange={handleChange}
        disabled={disabled}
      >
        {/* Placeholder option */}
        <option
          value={placeholderValue}
          disabled
          className="text-app-muted bg-app-subtle"
        >
          {placeholder}
        </option>
        {/* Map over options */}
        {options.map((option, index) => (
          <option
            key={`${option.value}-${index}`}
            value={option.value}
            className="text-app bg-app"
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
    </div>
  );
};

export default Select;
