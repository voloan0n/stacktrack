import React, { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode; // Button text or content
  size?: "xs" | "sm" | "md"; // Button size
  variant?: "primary" | "outline"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>; // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Disabled state
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  type = "button",
  onClick,
  className = "",
  disabled = false,
}) => {
  // Size Classes
  const sizeClasses = {
    xs: "px-3 py-2 text-xs",
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-[var(--color-primary)] text-white shadow-theme-xs hover:bg-[color-mix(in_oklab,var(--color-primary)_92%,black)] disabled:bg-[color-mix(in_oklab,var(--color-primary)_65%,white)]",
    outline:
      "bg-app text-app ring-1 ring-inset ring-[var(--color-border)] hover:bg-app-subtle",
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium gap-2 rounded-lg transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
