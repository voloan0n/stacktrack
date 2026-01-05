import { useCallback, useMemo, useState } from "react";

type Id = string | number;

type DisableState = {
  confirming: boolean;
  editDisabled: boolean;
  deleteDisabled: boolean;
  confirmDisabled: boolean;
};

export default function useRowActionState<TId extends Id = string>() {
  const [pendingDeleteId, setPendingDeleteId] = useState<TId | null>(null);
  const [deletingId, setDeletingId] = useState<TId | null>(null);

  const requestDelete = useCallback((id: TId) => setPendingDeleteId(id), []);
  const cancelDelete = useCallback(() => setPendingDeleteId(null), []);

  const runWithConfirm = useCallback(async (id: TId, onDelete: () => Promise<void>) => {
    setDeletingId(id);
    try {
      await onDelete();
    } finally {
      setDeletingId(null);
    }
  }, []);

  const confirmDelete = useCallback(
    async (id: TId, onDelete: () => Promise<void>) => {
      setPendingDeleteId(null);
      await runWithConfirm(id, onDelete);
    },
    [runWithConfirm]
  );

  const getDisableState = useCallback(
    (id: TId): DisableState => {
      const confirming = pendingDeleteId === id;
      const anyPending = pendingDeleteId !== null;
      const deleting = deletingId === id;

      return {
        confirming,
        editDisabled: anyPending,
        deleteDisabled: anyPending || deleting,
        confirmDisabled: deleting,
      };
    },
    [deletingId, pendingDeleteId]
  );

  const anyDeleting = useMemo(() => deletingId !== null, [deletingId]);
  const anyConfirming = useMemo(() => pendingDeleteId !== null, [pendingDeleteId]);

  return {
    pendingDeleteId,
    deletingId,
    anyDeleting,
    anyConfirming,
    requestDelete,
    cancelDelete,
    confirmDelete,
    runWithConfirm,
    getDisableState,
  };
}
