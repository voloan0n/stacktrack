import React from "react";

type AvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const FALLBACK = "primary";

interface UserIconProps {
  name?: string | null;
  color?: string | null;
  size?: AvatarSize;
  className?: string;
}

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const resolveColor = (rawColor?: string | null) => {
  if (rawColor) {
    const normalized = rawColor.trim();

    // If a tailwind-style class string is stored, keep using it
    if (normalized.includes("bg-") || normalized.includes("text-")) {
      return { className: normalized, style: undefined };
    }

    // Support raw color codes from legacy seed data
    if (/^#|^rgb/.test(normalized)) {
      return { className: "text-white", style: { backgroundColor: normalized } };
    }

    // Treat non-class, non-color-code strings as semantic intent keys (same as Badge)
    const semanticKey = normalized || FALLBACK;
    return {
      className: "bg-[var(--avatar-bg)] text-[var(--avatar-text)]",
      style: {
        ["--avatar-bg" as any]: `var(--color-semantic-${semanticKey}-bg, var(--color-semantic-neutral-bg))`,
        ["--avatar-text" as any]: `var(--color-semantic-${semanticKey}-fg, var(--color-semantic-neutral-fg))`,
      } as React.CSSProperties,
    };
  }

  return {
    className: "bg-[var(--avatar-bg)] text-[var(--avatar-text)]",
    style: {
      ["--avatar-bg" as any]: `var(--color-semantic-${FALLBACK}-bg, var(--color-semantic-neutral-bg))`,
      ["--avatar-text" as any]: `var(--color-semantic-${FALLBACK}-fg, var(--color-semantic-neutral-fg))`,
    } as React.CSSProperties,
  };
};

export default function UserIcon({
  name,
  color,
  size = "md",
  className = "",
}: UserIconProps) {
  const initials = getInitials(name);
  const { className: colorClass, style } = resolveColor(color);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${colorClass} ${className}`.trim()}
      style={style}
    >
      {initials}
    </div>
  );
}
