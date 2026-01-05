import React from "react";
import { TableCell, TableRow } from "@/shared/components/ui/table";

type Props = {
  colSpan: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  loadingText?: string;
  loadingRowCount?: number;
};

export default function TableBodyState({
  colSpan,
  isLoading,
  isEmpty,
  emptyText = "No results found.",
  loadingText = "Loading...",
  loadingRowCount = 5,
}: Props) {
  if (isLoading) {
    const widths = ["w-1/3", "w-1/2", "w-2/5", "w-3/5", "w-1/4"] as const;
    return (
      <>
        {Array.from({ length: Math.max(1, loadingRowCount) }).map((_, idx) => (
          <TableRow key={`loading-${idx}`} className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="px-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 animate-pulse rounded bg-app-subtle/60" />
                  <div
                    className={`h-3 ${widths[idx % widths.length]} animate-pulse rounded bg-app-subtle/60`}
                  />
                </div>
                {idx === 0 ? (
                  <p className="text-sm text-app-muted">{loadingText}</p>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  }

  if (isEmpty) {
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="px-4 py-8 text-center text-sm text-app-muted">
          {emptyText}
        </TableCell>
      </TableRow>
    );
  }

  return null;
}

