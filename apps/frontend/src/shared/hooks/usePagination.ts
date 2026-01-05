import { useCallback, useEffect, useMemo, useState } from "react";

type UsePaginationOptions = {
  totalItems: number;
  pageSize?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  initialPage?: number;
};

export default function usePagination({
  totalItems,
  pageSize = 10,
  page,
  onPageChange,
  initialPage = 1,
}: UsePaginationOptions) {
  const isControlled = typeof page === "number";
  const [uncontrolledPage, setUncontrolledPage] = useState(initialPage);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [pageSize, totalItems]);

  const currentPage = useMemo(() => {
    return isControlled ? (page as number) : uncontrolledPage;
  }, [isControlled, page, uncontrolledPage]);

  const setPage = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(1, nextPage), totalPages);
      if (isControlled) onPageChange?.(clamped);
      else setUncontrolledPage(clamped);
    },
    [isControlled, onPageChange, totalPages]
  );

  useEffect(() => {
    if (currentPage > totalPages) setPage(totalPages);
    if (currentPage < 1) setPage(1);
  }, [currentPage, setPage, totalPages]);

  const startIndex = useMemo(() => {
    return totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
  }, [currentPage, pageSize, totalItems]);

  const endIndexExclusive = useMemo(() => startIndex + pageSize, [pageSize, startIndex]);

  const showFrom = useMemo(() => (totalItems === 0 ? 0 : startIndex + 1), [startIndex, totalItems]);

  const showTo = useMemo(() => Math.min(endIndexExclusive, totalItems), [endIndexExclusive, totalItems]);

  const goPrev = useCallback(() => setPage(currentPage - 1), [currentPage, setPage]);
  const goNext = useCallback(() => setPage(currentPage + 1), [currentPage, setPage]);
  const resetToFirstPage = useCallback(() => setPage(1), [setPage]);

  return {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndexExclusive,
    showFrom,
    showTo,
    setPage,
    goPrev,
    goNext,
    resetToFirstPage,
  };
}

