"use client";
import React from "react";

import Input from "@/shared/components/form/input/InputField";
import { PhoneIcon } from "@/shared/icons";
import { getCountryCallingCode } from "@/shared/utils/phone";

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  country?: string | null;
};

export default function PhoneInput({
  value,
  onChange,
  placeholder = "(555) 555-5555",
  country,
  className = "",
  ...props
}: PhoneInputProps) {
  const callingCode = getCountryCallingCode(country);
  const effectivePlaceholder = placeholder.includes("+")
    ? placeholder
    : `${callingCode} ${placeholder}`;

  return (
    <div className="relative">
      <Input
        {...props}
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pl-12 ${className}`}
        placeholder={effectivePlaceholder}
      />
      <span className="pointer-events-none absolute inset-y-0 left-0 flex h-full items-center border-r border-divider px-3 text-app-muted">
        <span className="flex h-5 w-5 items-center justify-center">
          <PhoneIcon className="h-4 w-4 shrink-0" />
        </span>
      </span>
    </div>
  );
}
