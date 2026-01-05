import React, { ReactNode } from "react";

type TableContainerProps = {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  after?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export default function TableContainer({
  header,
  children,
  footer,
  after,
  className = "",
  scrollClassName = "max-w-full overflow-x-auto",
}: TableContainerProps) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-lg shadow-brand-900/5 ${className}`.trim()}
    >
      {header ? header : null}
      <div className={scrollClassName}>
        {children}
      </div>
      {footer ? footer : null}
      {after ? after : null}
    </div>
  );
}
