import { useCallback, useState } from "react";

type UseTableFilterOptions<TValue> = {
  initialValue: TValue;
  onChange?: (value: TValue) => void;
  resetPage?: () => void;
};

export default function useTableFilter<TValue>({
  initialValue,
  onChange,
  resetPage,
}: UseTableFilterOptions<TValue>) {
  const [value, setValue] = useState<TValue>(initialValue);

  const setFilter = useCallback(
    (next: TValue) => {
      setValue(next);
      resetPage?.();
      onChange?.(next);
    },
    [onChange, resetPage]
  );

  return { value, setFilter };
}

