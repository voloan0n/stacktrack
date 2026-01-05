import Button from "@/shared/components/ui/button/Button";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  const pagesAroundCurrent = (() => {
    const maxPagesToShow = Math.min(3, totalPages);
    const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
    return Array.from({ length: maxPagesToShow }, (_, i) => start + i).filter(
      (page) => page >= 1 && page <= totalPages
    );
  })();

  return (
    <div className="flex items-center">
      <Button
        size="xs"
        variant="outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="mr-2.5 h-8"
      >
        Previous
      </Button>

      <div className="flex items-center gap-2">
        {currentPage > 3 ? (
          <span className="px-1 text-xs text-app-muted">...</span>
        ) : null}

        {pagesAroundCurrent.map((page) => (
          <Button
            key={page}
            size="xs"
            variant={currentPage === page ? "primary" : "outline"}
            onClick={() => onPageChange(page)}
            className="h-8 min-w-8 px-0"
          >
            {page}
          </Button>
        ))}

        {currentPage < totalPages - 2 ? (
          <span className="px-1 text-xs text-app-muted">...</span>
        ) : null}
      </div>

      <Button
        size="xs"
        variant="outline"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="ml-2.5 h-8"
      >
        Next
      </Button>
    </div>
  );
};

export default Pagination;
