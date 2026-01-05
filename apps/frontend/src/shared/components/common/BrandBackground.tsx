import React from "react";

export default function BrandBackground({ className = "opacity-70" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-[color-mix(in_oklab,var(--color-primary)_28%,transparent)] blur-3xl" />
      <div className="absolute right-10 top-32 h-80 w-80 rounded-full bg-[color-mix(in_oklab,var(--color-primary)_20%,transparent)] blur-3xl" />
      <div className="absolute -bottom-20 right-24 h-96 w-96 rounded-full bg-[color-mix(in_oklab,var(--color-primary)_24%,transparent)] blur-3xl" />
    </div>
  );
}

