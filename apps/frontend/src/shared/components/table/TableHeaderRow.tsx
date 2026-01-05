import React, { ReactNode } from "react";
import { TableCell, TableHeader, TableRow } from "@/shared/components/ui/table";

export type TableHeaderColumn = {
  key: string;
  label?: ReactNode;
  header?: ReactNode;
  className?: string;
};

type TableHeaderRowProps = {
  columns: TableHeaderColumn[];
  headerClassName?: string;
  cellBaseClassName?: string;
};

export default function TableHeaderRow({
  columns,
  headerClassName = "bg-app-subtle",
  cellBaseClassName = "px-4 py-3 whitespace-nowrap",
}: TableHeaderRowProps) {
  return (
    <TableHeader className={headerClassName}>
      <TableRow>
        {columns.map((col) => {
          const content =
            col.header ??
            (typeof col.label === "string" ? (
              <p className="text-sm font-medium text-app">{col.label}</p>
            ) : (
              col.label
            ));

          return (
            <TableCell
              key={col.key}
              isHeader
              className={`${cellBaseClassName} ${col.className || ""}`.trim()}
            >
              {content}
            </TableCell>
          );
        })}
      </TableRow>
    </TableHeader>
  );
}

