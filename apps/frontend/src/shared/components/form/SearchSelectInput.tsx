"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type SearchSelectInputProps<T> = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  inputRef?: React.Ref<HTMLInputElement>;
  disabled?: boolean;
  minChars?: number;
  debounceMs?: number;
  searchingText?: string;
  belowMinCharsText?: string;
  emptyText?: string;
  inputClassName?: string;
};

export default function SearchSelectInput<T>({
  value,
  onChange,
  onSelect,
  search,
  renderItem,
  getKey,
  inputRef,
  disabled = false,
  minChars = 3,
  debounceMs = 150,
  searchingText = "Searching...",
  belowMinCharsText,
  emptyText,
  inputClassName = "",
}: SearchSelectInputProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const query = value.trim();

  const shouldSearch = open && query.length >= minChars && !disabled;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      return;
    }
    if (!shouldSearch) {
      setLoading(false);
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next = await search(query, controller.signal);
        setResults(next);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [debounceMs, open, query, search, shouldSearch]);

  const dropdownBody = useMemo(() => {
    if (disabled) return null;
    if (query.length < minChars) return belowMinCharsText ? (
      <div className="px-4 py-3 text-sm text-app-muted">{belowMinCharsText}</div>
    ) : null;
    if (loading) return (
      <div className="px-4 py-3 text-sm text-app-muted">{searchingText}</div>
    );
    if (!results.length) return emptyText ? (
      <div className="px-4 py-3 text-sm text-app-muted">{emptyText}</div>
    ) : null;

    return (
      <div className="max-h-64 overflow-auto">
        {results.map((item) => (
          <button
            key={getKey(item)}
            type="button"
            onClick={() => {
              onSelect(item);
              setOpen(false);
            }}
            className="w-full border-b border-app px-4 py-3 text-left text-sm hover:bg-app-subtle last:border-b-0"
          >
            {renderItem(item)}
          </button>
        ))}
      </div>
    );
  }, [
    belowMinCharsText,
    disabled,
    emptyText,
    getKey,
    loading,
    minChars,
    onSelect,
    query.length,
    renderItem,
    results,
    searchingText,
  ]);

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        className={inputClassName}
        disabled={disabled}
      />

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-2">
          <div className="overflow-hidden rounded-xl border border-app bg-app shadow-theme-lg">
            {dropdownBody}
          </div>
        </div>
      ) : null}
    </div>
  );
}
