import Link from "next/link";
import React from "react";

interface BreadcrumbProps {
  pageTitle: string;
  pageSubtitle?: string;
  items?: { label: string; href?: string }[];
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({
  pageTitle,
  pageSubtitle,
  items,
}) => {
  const subtitle = pageSubtitle ?? pageTitle;

  const trail = [
    { label: "Home", href: "/" },
    ...(items && items.length ? items : [{ label: subtitle }]),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
        StackTrack
      </div>

      <nav aria-label="Breadcrumb" className="shrink-0">
        <ol className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          {trail.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-1.5"
            >
              {index > 0 && <span className="opacity-70">&gt;</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
