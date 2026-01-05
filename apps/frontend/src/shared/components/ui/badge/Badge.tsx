import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  /**
   * Semantic intent key. This resolves to global CSS variables:
   * - `--color-semantic-<key>-bg` / `--color-semantic-<key>-fg` (light)
   * - `--color-semantic-<key>-solid-bg` / `--color-semantic-<key>-solid-fg` (solid)
   *
   * Fallbacks to `neutral` if the key is not defined in CSS.
   */
  color?: string;
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs", // Smaller padding and font size
    md: "text-sm", // Default padding and font size
  };

  const sizeClass = sizeStyles[size];

  const semanticKey = (color || "primary").trim() || "primary";

  const style =
    variant === "light"
      ? ({
          "--badge-bg": `var(--color-semantic-${semanticKey}-bg, var(--color-semantic-neutral-bg))`,
          "--badge-text": `var(--color-semantic-${semanticKey}-fg, var(--color-semantic-neutral-fg))`,
        } as React.CSSProperties)
      : ({
          "--badge-bg": `var(--color-semantic-${semanticKey}-solid-bg, var(--color-semantic-neutral-solid-bg))`,
          "--badge-text": `var(--color-semantic-${semanticKey}-solid-fg, var(--color-semantic-neutral-solid-fg))`,
        } as React.CSSProperties);

  const colorClasses = "bg-[var(--badge-bg)] text-[var(--badge-text)]";

  return (
    <span style={style} className={`${baseStyles} ${sizeClass} ${colorClasses}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
