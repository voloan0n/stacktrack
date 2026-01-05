"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { FilterIcon } from "@/shared/icons";
import { Dropdown } from "@/shared/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/shared/components/ui/dropdown/DropdownItem";

type FilterOption = {
  label: string;
  value: string;
};

interface FilterDropdownProps {
  options: FilterOption[];
  onChange: (value: string) => void;
  selected?: string;
  buttonLabel?: string;
  className?: string;
}

export default function FilterDropdown({
  options,
  onChange,
  selected,
  buttonLabel = "Filter",
  className = "",
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        size="sm"
        variant="outline"
        startIcon={<FilterIcon />}
        className="dropdown-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {buttonLabel}
      </Button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="w-48 p-1"
      >
        {options.map((opt) => {
          const isSelected = selected === opt.value;

          return (
            <DropdownItem
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`rounded-lg px-3 py-2 text-sm hover:bg-app-subtle ${
                isSelected ? "text-[var(--color-primary)]" : "text-app"
              }`}
            >
              {opt.label}
            </DropdownItem>
          );
        })}
      </Dropdown>
    </div>
  );
}
