import React, { ReactNode, useContext } from "react";
import { twMerge } from "tailwind-merge";

type TableDensity = "comfortable" | "compact";

const TableContext = React.createContext<{ density: TableDensity }>({
  density: "comfortable",
});

// Props for Table
interface TableProps {
  children: ReactNode; // Table content (thead, tbody, etc.)
  className?: string; // Optional className for styling
  density?: TableDensity;
}

// Props for TableHeader
interface TableHeaderProps {
  children: ReactNode; // Header row(s)
  className?: string; // Optional className for styling
}

// Props for TableBody
interface TableBodyProps {
  children: ReactNode; // Body row(s)
  className?: string; // Optional className for styling
}

// Props for TableRow
interface TableRowProps {
  children: ReactNode; // Cells (th or td)
  className?: string; // Optional className for styling
}

// Props for TableCell
interface TableCellProps {
  children: ReactNode; // Cell content
  isHeader?: boolean; // If true, renders as <th>, otherwise <td>
  className?: string; // Optional className for styling
  colSpan?: number;
}

// Table Component
const Table: React.FC<TableProps> = ({
  children,
  className,
  density = "comfortable",
}) => {
  return (
    <TableContext.Provider value={{ density }}>
      <table
        className={twMerge("min-w-full caption-bottom text-sm text-app", className)}
      >
        {children}
      </table>
    </TableContext.Provider>
  );
};

// TableHeader Component
const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  const base =
    "bg-[var(--table-header-bg)] text-app border-b border-divider-strong";
  return (
    <thead className={twMerge(base, className)}>
      {children}
    </thead>
  );
};

// TableBody Component
const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  const base = "divide-y divide-[var(--table-divider)]";
  return <tbody className={twMerge(base, className)}>{children}</tbody>;
};

// TableRow Component
const TableRow: React.FC<TableRowProps> = ({ children, className }) => {
  const base = "transition-colors hover:bg-[var(--table-row-hover-bg)]";
  return <tr className={twMerge(base, className)}>{children}</tr>;
};

// TableCell Component
const TableCell: React.FC<TableCellProps> = ({ children, isHeader = false, className, colSpan }) => {
  const { density } = useContext(TableContext);
  const padding = density === "compact" ? "px-4 py-2" : "px-4 py-3";
  const base = isHeader
    ? "align-middle text-left font-medium text-app"
    : "align-middle text-app";
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag
      scope={isHeader ? "col" : undefined}
      className={twMerge(padding, base, className)}
      colSpan={colSpan}
    >
      {children}
    </CellTag>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
