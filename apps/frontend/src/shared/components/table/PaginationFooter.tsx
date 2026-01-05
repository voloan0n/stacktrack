"use client";

import Pagination from "./Pagination";

type PaginationFooterProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  size?: "lg" | "sm";
  showSummary?: boolean;
  className?: string;
};

export default function PaginationFooter({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  size = "lg",
  showSummary,
  className = "",
}: PaginationFooterProps) {
  const showFrom = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showTo = Math.min(currentPage * pageSize, totalItems);

  const resolvedShowSummary = showSummary ?? true;
  const paddingClass = size === "sm" ? "px-4 py-3" : "px-5 py-4";
  const summaryClass = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={`flex flex-col items-center gap-3 border-t border-app ${paddingClass} ${
        resolvedShowSummary ? "sm:flex-row sm:justify-between" : "sm:flex-row sm:justify-end"
      } ${className}`.trim()}
    >
      {resolvedShowSummary ? (
        <div className={`${summaryClass} text-app-muted`.trim()}>
          {size === "sm" ? (
            <>
              <span className="text-app">{showFrom}</span>–<span className="text-app">{showTo}</span>{" "}
              of <span className="text-app">{totalItems}</span>
            </>
          ) : (
            <>
              Showing <span className="text-app">{showFrom}</span> to{" "}
              <span className="text-app">{showTo}</span> of{" "}
              <span className="text-app">{totalItems}</span>
            </>
          )}
        </div>
      ) : null}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
