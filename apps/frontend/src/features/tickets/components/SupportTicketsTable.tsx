"use client";
import Checkbox from "@/shared/components/form/input/Checkbox";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Badge from "@/shared/components/ui/badge/Badge";
import Button from "@/shared/components/ui/button/Button";
import { Table, TableBody, TableCell, TableRow } from "@/shared/components/ui/table";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import FilterDropdown from "@/shared/components/common/FilterDropdown";
import CardHeader from "@/shared/components/common/CardHeader";
import TableContainer from "@/shared/components/table/TableContainer";
import TableHeaderRow from "@/shared/components/table/TableHeaderRow";
import TicketForm from "./TicketForm";
import {
  assignTicket,
  createTicket,
  updateTicket,
} from "@/features/tickets/hooks/useTicketActions";
import { deleteTicket } from "@/features/tickets/hooks/useTicketActions";
import UserClientForm from "@/features/clients/components/UserClientForm";
import { updateClient } from "@/features/clients/hooks/useUpdateClient";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import {
  FileIcon,
} from "@/shared/icons";
import { useAuth } from "@/features/auth/lib/provider";
import { computeNextActionDue } from "@/features/tickets/utils/deadlines";
import AssigneeMiniList, { AssigneeReference } from "./AssigneeMiniList";
import usePagination from "@/shared/hooks/usePagination";
import usePermissions from "@/shared/hooks/usePermissions";
import useRowActionState from "@/shared/hooks/useRowActionState";
import useTableFilter from "@/shared/hooks/useTableFilter";
import { formatShortDate } from "@/shared/utils/date";
import { formatCityState } from "@/shared/utils/location";
import TableBodyState from "@/shared/components/table/TableBodyState";
import {
  getTicketCategoryBadgeColor,
  getTicketPriorityBadgeColor,
  getTicketStatusBadgeColor,
} from "@/features/tickets/utils/badges";
import useTicketOptions from "@/features/tickets/hooks/useTicketOptions";
import {
  createTicketOptionHoursMap,
  createTicketOptionLabelMap,
  normalizeTicketOptionKey,
} from "@/features/tickets/utils/options";

interface Ticket {
  id: string;
  displayId: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  createdAt: string;
  internalOnly?: boolean;
  requester?: {
    id?: string;
    name?: string;
    email?: string;
    avatarColor?: string | null;
  };
  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
    avatarColor?: string | null;
  };
  client?: {
    id?: string;
    name: string;
    email: string;
    city?: string;
    state?: string;
  };
  assignees?: Array<AssigneeReference | null | undefined>;
}

export default function SupportTicketsTable({
  tickets,
  loading,
  selected,
  onSelectedChange,
  onRefresh,
  openCreateTicket,
}: {
  tickets: Ticket[];
  loading?: boolean;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  onRefresh?: () => Promise<void>;
  openCreateTicket?: boolean;
}) {
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const { options: ticketOptions } = useTicketOptions();

  const statusDeadlineMap = useMemo(() => {
    return createTicketOptionHoursMap(ticketOptions.statuses);
  }, [ticketOptions.statuses]);

  const statusLabelByKey = useMemo(() => {
    return createTicketOptionLabelMap(ticketOptions.statuses);
  }, [ticketOptions.statuses]);

  const priorityLabelByKey = useMemo(() => {
    return createTicketOptionLabelMap(ticketOptions.priorities);
  }, [ticketOptions.priorities]);

  const categoryLabelByKey = useMemo(() => {
    return createTicketOptionLabelMap(ticketOptions.types);
  }, [ticketOptions.types]);

  /** -------------------------
   * PAGINATION
   * ------------------------ */
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const { value: filter, setFilter } = useTableFilter<string>({
    initialValue: "all",
    resetPage: () => setCurrentPage(1),
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const { requestDelete, cancelDelete, confirmDelete, getDisableState } =
    useRowActionState<string>();

  const { user } = useAuth() || { user: null };
  const { can: canPermission } = usePermissions(user?.permissions);
  const canCreateTicket = canPermission("ticket.create");
  const canUpdateTicket = canPermission("ticket.update");
  const canAssignTicket = canPermission("ticket.assign");
  const canSeeInternalTickets = canPermission("ticket.internal.view");

  const filteredTickets = tickets.filter((t) => {
    if (t.internalOnly && !canSeeInternalTickets) return false;
    if (filter !== "all") {
      return normalizeTicketOptionKey(t.status) === normalizeTicketOptionKey(filter);
    }
    return true;
  });

  const totalItems = filteredTickets.length;
  const pagination = usePagination({
    totalItems,
    pageSize: PAGE_SIZE,
    page: currentPage,
    onPageChange: setCurrentPage,
  });

  const visibleTickets = filteredTickets.slice(
    pagination.startIndex,
    pagination.endIndexExclusive
  );

  const handleSaveTicket = async (data: any) => {
    try {
      setCreating(true);
      const payload = {
        ...data,
        name: data.clientName,
        email: data.clientEmail,
        company: data.clientId,
        clientId: data.clientId,
        detail: data.detail ? { text: data.detail, internal: data.internalOnly } : {},
        priority: data.priority,
        type: data.type,
        title: data.title,
        internalOnly: data.internalOnly,
        status: data.status,
      };

      if (data.id) {
        await updateTicket(data.id, payload);
      } else {
        const created = await createTicket(payload);
        const createdId =
          (created as any)?.ticket?.id || (created as any)?.id || (created as any)?.ticketId;
        const actorId = (user as any)?.id;
        if (createdId && actorId) {
          await assignTicket(String(createdId), String(actorId), "transfer");
        }
      }
      setModalOpen(false);
      setActiveTicket(null);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("❌ Failed to save ticket:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTicketById = async (id: string) => {
    await deleteTicket(id);
    if (onRefresh) await onRefresh();
  };

  const openedFromUrlRef = useRef(false);
  useEffect(() => {
    if (!openCreateTicket) return;
    if (openedFromUrlRef.current) return;
    openedFromUrlRef.current = true;
    setActiveTicket(null);
    setModalOpen(true);
  }, [openCreateTicket]);

  const handleViewTicket = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setModalOpen(true);
  };

  const handleEditClientFromTicket = (ticket: Ticket) => {
    const clientId = ticket.client?.id;
    if (!clientId) return;
    setSelectedClient({
      id: clientId,
      name: ticket.client?.name,
      email: ticket.client?.email,
    });
    setClientModalOpen(true);
  };

  const handleSaveClient = async (updatedData: any) => {
    if (!updatedData?.id) return;
    try {
      await updateClient(updatedData.id, updatedData);
      setClientModalOpen(false);
      setSelectedClient(null);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("❌ Failed to update client:", err);
    }
  };

  const closeModal = () => {
    setActiveTicket(null);
    setModalOpen(false);
  };

  /** -------------------------
   * SELECT ALL + ROW SELECTION
   * ------------------------ */
  const currentPageIds = visibleTickets.map((t) => t.id);
  const allSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selected.includes(id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newIds = Array.from(new Set([...selected, ...currentPageIds]));
      onSelectedChange(newIds);
    } else {
      const filtered = selected.filter((id) => !currentPageIds.includes(id));
      onSelectedChange(filtered);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) onSelectedChange([...selected, id]);
    else onSelectedChange(selected.filter((v) => v !== id));
  };

  return (
    <TableContainer
      scrollClassName="relative max-w-full overflow-x-auto overflow-y-visible"
      /* ========================================================= */
      /*                      HEADER SECTION                       */
      /* ========================================================= */
      header={
        <CardHeader
          eyebrow="Support"
          title="Support Tickets"
          description="Keep pace with every request, internal or client-facing."
        >
          <FilterDropdown
            options={[
              { label: "All", value: "all" },
              ...(ticketOptions.statuses || [])
                .filter((s) => s?.active !== false)
                .map((s) => ({ label: s.label, value: s.key })),
            ]}
            selected={filter}
            onChange={setFilter}
          />

          <Button
            size="sm"
            variant="primary"
            startIcon={<FileIcon />}
            onClick={() => {
              setActiveTicket(null);
              setModalOpen(true);
            }}
            disabled={creating || !canCreateTicket}
          >
            Create New Ticket
          </Button>
        </CardHeader>
      }
      /* ========================================================= */
      /*                          FOOTER                           */
      /* ========================================================= */
      footer={
        <PaginationFooter
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={pagination.setPage}
        />
      }
      /* ========================================================= */
      /*                          MODALS                           */
      /* ========================================================= */
      after={
        <>
          <TicketForm
            isOpen={modalOpen}
            onClose={closeModal}
            onSave={handleSaveTicket}
            canAssign={canAssignTicket}
            canCreate={canCreateTicket}
            canUpdate={canUpdateTicket}
            ticket={
              activeTicket
                ? {
                    id: activeTicket.id,
                    title: activeTicket.title,
                    priority: (activeTicket.priority || "").toLowerCase(),
                    type: (activeTicket.type || "").toLowerCase(),
                    internalOnly: (activeTicket as any).internalOnly,
                    client: {
                      name: activeTicket.client?.name,
                      email: activeTicket.client?.email,
                    },
                  }
                : undefined
            }
          />

          <UserClientForm
            client={selectedClient}
            isOpen={clientModalOpen}
            onClose={() => {
              setClientModalOpen(false);
              setSelectedClient(null);
            }}
            onSave={handleSaveClient}
          />
        </>
      }
    >
      {/* ========================================================= */}
      {/*                          TABLE                            */}
      {/* ========================================================= */}
      <Table className="table-auto border-collapse min-w-full">
        {/* ======== HEADER ======== */}
        <TableHeaderRow
          headerClassName="border-b border-divider-strong bg-app-subtle"
          cellBaseClassName="px-5 py-3 whitespace-nowrap"
          columns={[
            {
              key: "ticketId",
              className: "text-left w-[170px]",
              header: (
                <div className="flex items-center gap-4">
                  <Checkbox checked={allSelected} onChange={handleSelectAll} />
                  <p className="text-sm font-medium text-app">Ticket ID</p>
                </div>
              ),
            },
            { key: "ticket", label: "Ticket", className: "text-left w-[360px]" },
            { key: "requestedBy", label: "Requested By", className: "text-left w-[260px]" },
            { key: "status", label: "Status", className: "text-center w-[125px]" },
            { key: "priority", label: "Priority", className: "text-center w-[110px]" },
            { key: "category", label: "Category", className: "text-center w-[110px]" },
            { key: "assignees", label: "Assignees", className: "text-center w-[150px]" },
            { key: "actions", label: "Actions", className: "text-center w-[120px]" },
          ]}
        />

        {/* ========= BODY ========= */}
        <TableBody className="divide-y divide-table">
          <TableBodyState
            colSpan={8}
            isLoading={!!loading}
            isEmpty={!loading && visibleTickets.length === 0}
            emptyText="No tickets found."
            loadingText="Loading tickets..."
          />
          {visibleTickets.map((ticket) => {
            const nextActionDue = computeNextActionDue(ticket, statusDeadlineMap);
            const clientCity = (ticket.client as any)?.city || (ticket.client as any)?.addressCity;
              const clientState = (ticket.client as any)?.state || (ticket.client as any)?.addressState;
              const clientCityState = formatCityState(clientCity, clientState);

              const requestedByName = ticket.internalOnly
                ? ticket.createdBy?.name || "Unknown User"
                : ticket.client?.name || "—";
              const requestedBySubtitle = ticket.internalOnly ? "Internal" : clientCityState;
              const disableState = getDisableState(ticket.id);

              const statusKey = normalizeTicketOptionKey(ticket.status);
              const statusLabel = statusLabelByKey[statusKey] || ticket.status || "—";
              const priorityKey = normalizeTicketOptionKey(ticket.priority);
              const priorityLabel = priorityLabelByKey[priorityKey] || ticket.priority || "—";
              const categoryKey = normalizeTicketOptionKey(ticket.type);
              const categoryLabel = categoryLabelByKey[categoryKey] || ticket.type || "—";
              return (
              <TableRow
                key={ticket.id}
                className={
                  loading ? "pointer-events-none opacity-50 hover:bg-transparent" : "transition hover:bg-app-subtle"
                }
              >
                {/* TICKET ID */}
                <TableCell className="px-5 py-4 text-left whitespace-nowrap w-[170px]">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selected.includes(ticket.id)}
                      onChange={(checked) => handleSelectRow(ticket.id, checked)}
                    />
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-sm font-medium text-app hover:underline"
                    >
                      {ticket.displayId}
                    </Link>
                  </div>
                </TableCell>

                {/* TICKET */}
                <TableCell className="px-5 py-4 text-left w-[360px]">
                  {(() => {
                    const now = Date.now();
                    const diffMs = nextActionDue ? nextActionDue.getTime() - now : null;

                    const dueText = formatShortDate(nextActionDue);

                    const dueClass =
                      diffMs === null
                        ? "text-app-muted"
                        : diffMs < 0
                          ? "text-error-600 dark:text-error-400"
                          : diffMs < 24 * 60 * 60 * 1000
                            ? "text-warning-700 dark:text-warning-300"
                            : diffMs < 3 * 24 * 60 * 60 * 1000
                              ? "text-info-700 dark:text-info-300"
                              : "text-app-muted";

                    return (
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block truncate text-sm font-medium text-app hover:underline"
                    >
                      {ticket.title}
                    </Link>
                    <p className="text-xs text-app-muted">
                      Next Action Due: <span className={dueClass}>{dueText}</span>
                    </p>
                  </div>
                    );
                  })()}
                </TableCell>

                {/* CLIENT */}
                <TableCell className="px-5 py-4 text-left w-[260px]">
                  <div className="space-y-0.5">
                    {!ticket.internalOnly && ticket.client?.id ? (
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-app hover:underline"
                        onClick={() => handleEditClientFromTicket(ticket)}
                      >
                        {requestedByName}
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-app">{requestedByName}</p>
                    )}
                    <p className="text-xs text-app-muted">{requestedBySubtitle}</p>
                  </div>
                </TableCell>

                {/* STATUS */}
                <TableCell className="px-5 py-4 text-center whitespace-nowrap w-[125px]">
                  <Badge
                    size="sm"
                    color={getTicketStatusBadgeColor(statusKey)}
                  >
                    {statusLabel}
                  </Badge>
                </TableCell>

                {/* PRIORITY */}
                <TableCell className="px-5 py-4 text-center whitespace-nowrap w-[110px]">
                  <Badge size="sm" color={getTicketPriorityBadgeColor(priorityKey)}>
                    {priorityLabel}
                  </Badge>
                </TableCell>

                {/* CATEGORY */}
                <TableCell className="px-5 py-4 text-center w-[110px] whitespace-nowrap">
                  <Badge size="sm" color={getTicketCategoryBadgeColor(categoryKey)}>
                    {categoryLabel}
                  </Badge>
                </TableCell>

                {/* ASSIGNEES */}
                <TableCell className="px-5 py-4 text-center whitespace-nowrap">
                  <div className="flex justify-center">
                    <AssigneeMiniList assignees={ticket.assignees} maxVisible={2} />
                  </div>
                </TableCell>

                {/* ACTIONS */}
                <TableCell className="px-5 py-4 text-center whitespace-nowrap w-[120px]">
                  <ActionIconGroup
                    stopPropagation
                    confirming={disableState.confirming}
                    onEdit={() => handleViewTicket(ticket)}
                    onRequestDelete={() => requestDelete(ticket.id)}
                    onConfirm={async () => {
                      await confirmDelete(ticket.id, () => handleDeleteTicketById(ticket.id));
                    }}
                    onCancel={cancelDelete}
                    disabled={!canUpdateTicket}
                    editDisabled={disableState.editDisabled}
                    deleteDisabled={disableState.deleteDisabled}
                    confirmDisabled={disableState.confirmDisabled}
                  />
                </TableCell>

              </TableRow>
            );
            })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
