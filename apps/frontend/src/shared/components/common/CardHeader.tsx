import React, { ReactNode } from "react";

/**
 * Visual style of the header background.
 * - "gradient": soft gradient wash based on the theme brand color
 * - "solid": flat background fill based on the theme brand color
 * - "neutral": uses theme surface colors (no accent)
 */
type CardHeaderVariant = "gradient" | "solid" | "neutral";

type CardHeaderSize = "lg" | "md" | "sm";

interface CardHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  /**
   * Optional leading icon/avatar shown to the left of the text stack.
   * Useful for client info cards, etc.
   */
  icon?: ReactNode;
  /**
   * Right-side content area (filters, buttons, tabs, etc).
   */
  children?: ReactNode;
  /**
   * Size variant:
   * - "lg": default, used for primary cards
   * - "md": matches the "Current users / Active accounts" header style
   * - "sm": compact eyebrow/title like timeline headers
   */
  size?: CardHeaderSize;
  /**
   * Visual style for the header background (currently ignored; kept for backwards compatibility).
   */
  variant?: CardHeaderVariant;
  /**
   * Additional classes applied to the outer header container.
   * Use to tweak padding (px-4/py-3, etc.) per card while
   * keeping typography consistent.
   */
  className?: string;
}

const eyebrowBase = "text-xs uppercase tracking-[0.2em]";

const CardHeader: React.FC<CardHeaderProps> = ({
  eyebrow,
  title,
  description,
  icon,
  children,
  variant: _variant = "solid", // kept for API compatibility but no longer affects styling
  size = "lg",
  className = "",
}) => {
  const containerClasses =
    size === "sm"
      ? ""
      : size === "md"
        ? "border-b border-divider bg-app-subtle px-4 py-3"
        : "border-b border-app bg-app-subtle px-5 py-5";

  const eyebrowClasses = `${eyebrowBase} text-[var(--color-semantic-primary-fg)]`;

  const titleBase =
    size === "sm"
      ? "text-sm font-semibold"
      : size === "md"
        ? "text-sm font-medium"
        : "text-xl font-semibold";
  const descriptionBase = size === "lg" ? "text-sm" : "text-xs";

  const titleTextClasses = "text-app";

  const descriptionTextClasses = "text-app-muted";

  return (
    <div className={`${containerClasses} ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={icon ? "flex items-center gap-3" : undefined}>
          {icon ? <div>{icon}</div> : null}
          <div className="space-y-1">
            <p className={eyebrowClasses}>{eyebrow}</p>
            <h3 className={`${titleBase} ${titleTextClasses}`}>
              {title}
            </h3>
            {description ? (
              <p className={`${descriptionBase} ${descriptionTextClasses}`}>
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {children ? (
          <div className="relative mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CardHeader;
