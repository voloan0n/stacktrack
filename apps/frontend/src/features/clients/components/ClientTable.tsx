"use client";

import React, { useEffect, useRef, useState } from "react";
import { UserIcon } from "@/shared/icons";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import Button from "@/shared/components/ui/button/Button";
import Badge from "@/shared/components/ui/badge/Badge";
import UserClientForm from "./UserClientForm";
import CardHeader from "@/shared/components/common/CardHeader";
import TableContainer from "@/shared/components/table/TableContainer";
import TableHeaderRow from "@/shared/components/table/TableHeaderRow";
import {
  createClient,
  deleteClient,
  updateClient,
} from "@/features/clients/hooks/useUpdateClient"; // Ensure this is imported
import { useAuth } from "@/features/auth/lib/provider";
import { getPhoneDisplayAndHref } from "@/shared/utils/phone";
import usePermissions from "@/shared/hooks/usePermissions";
import useRowActionState from "@/shared/hooks/useRowActionState";
import { formatShortDate } from "@/shared/utils/date";
import { formatCityState } from "@/shared/utils/location";
import TableBodyState from "@/shared/components/table/TableBodyState";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt?: string | null;
  addressCity?: string;
  addressState?: string;
  ticketCount?: number;
}

interface Props {
  clients: Client[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void; // <-- ADD THIS to parent component props
  openCreateClient?: boolean;
}

export default function ClientListTable({
  clients,
  loading,
  page,
  totalPages,
  onPageChange,
  onRefresh,
  openCreateClient,
}: Props) {
  const PAGE_SIZE = 10;
  const { user } = useAuth() || { user: null };
  const { can: canPermission } = usePermissions(user?.permissions);
  const canManageClients = canPermission("client.manage");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const {
    requestDelete,
    cancelDelete,
    confirmDelete,
    runWithConfirm,
    getDisableState,
  } = useRowActionState<string>();

  const handleEditClick = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedClient(null);
    setModalOpen(true);
  };

  const openedFromUrlRef = useRef(false);
  useEffect(() => {
    if (!openCreateClient) return;
    if (!canManageClients) return;
    if (openedFromUrlRef.current) return;
    openedFromUrlRef.current = true;
    handleAddClick();
  }, [canManageClients, openCreateClient]);

  const handleSave = async (updatedData: any) => {
    try {
      if (updatedData.id) {
        await updateClient(updatedData.id, updatedData);
      } else {
        await createClient(updatedData);
      }
      setModalOpen(false);
      setSelectedClient(null);
      onRefresh(); // Refresh the table after update
    } catch (err) {
      console.error("❌ Failed to update client:", err);
    }
  };

  const handleDeleteById = async (clientId: string) => {
    await deleteClient(clientId);
    onRefresh();
  };

  const filteredClients = clients;

  const totalItems = filteredClients.length;

  const columns = [
    { key: "client", label: "Client", className: "w-[380px] text-left" },
    { key: "phone", label: "Phone", className: "w-[170px] text-left" },
    { key: "email", label: "Email", className: "w-[260px] text-left" },
    { key: "tickets", label: "Tickets", className: "w-[110px] text-center" },
    { key: "created", label: "Created", className: "w-[150px] text-center" },
    { key: "actions", label: "Actions", className: "w-[110px] text-center" },
  ];

  return (
    <TableContainer
      /* ========================================================= */
      /*                      HEADER SECTION                       */
      /* ========================================================= */
      header={
        <CardHeader
          eyebrow="Client"
          title="Client Directory"
          description="Keep contact, company, and billing info tidy for reuse."
        >
          <Button
            size="sm"
            variant="primary"
            startIcon={<UserIcon />}
            onClick={handleAddClick}
            disabled={!canManageClients}
          >
            Add Client
          </Button>
        </CardHeader>
      }
      /* ========================================================= */
      /*                          FOOTER                           */
      /* ========================================================= */
      footer={
        <PaginationFooter
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={onPageChange}
        />
      }
      /* ========================================================= */
      /*                          MODALS                           */
      /* ========================================================= */
      after={
        <UserClientForm
          client={selectedClient}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
                  onDelete={
                    selectedClient
                      ? () =>
                  runWithConfirm(selectedClient.id, () => handleDeleteById(selectedClient.id))
                      : undefined
                  }
        />
      }
    >
      {/* ========================================================= */}
      {/*                          TABLE                            */}
      {/* ========================================================= */}
      <Table className="table-auto border-collapse min-w-full">
        {/* ======== HEADER ======== */}
        <TableHeaderRow columns={columns} />

        {/* ========= BODY ========= */}
        <TableBody className="divide-y divide-table">
          <TableBodyState
            colSpan={6}
            isLoading={loading}
            isEmpty={!loading && filteredClients.length === 0}
            emptyText="No clients found."
            loadingText="Loading clients..."
          />
          {filteredClients.map((client) => {
            const disableState = getDisableState(client.id);

            return (
              <TableRow
                key={client.id}
                className={loading ? "pointer-events-none opacity-50 hover:bg-transparent" : "transition hover:bg-app-subtle"}
              >
                  <TableCell className="px-4 py-3 text-left w-[380px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-app">{client.name}</span>
                      <p className="text-sm text-app-muted">
                        {formatCityState(client.addressCity, client.addressState)}
                      </p>
                    </div>
                  </TableCell>

                  {/* PHONE */}
                  <TableCell className="px-4 py-3 text-left whitespace-nowrap w-[170px]">
                    {(() => {
                      const { display, href } = getPhoneDisplayAndHref(client.phone);
                      return href ? (
                        <a href={href} className="text-sm text-app underline underline-offset-2">
                          {display}
                        </a>
                      ) : (
                        <p className="text-sm text-app">{display}</p>
                      );
                    })()}
                  </TableCell>

                  {/* EMAIL */}
                  <TableCell className="px-4 py-3 text-left w-[260px]">
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="text-sm text-app underline underline-offset-2"
                      >
                        {client.email}
                      </a>
                    ) : (
                      <p className="text-sm text-app-muted">—</p>
                    )}
                  </TableCell>

                  {/* TICKETS */}
                  <TableCell className="px-4 py-3 text-center whitespace-nowrap w-[110px]">
                    <Badge size="sm" color="neutral">
                      {typeof client.ticketCount === "number" ? client.ticketCount : "—"}
                    </Badge>
                  </TableCell>

                  {/* CREATED */}
                  <TableCell className="px-4 py-3 text-center whitespace-nowrap w-[150px]">
                    <p className="text-sm text-app">{formatShortDate(client.createdAt)}</p>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell className="px-4 py-3 text-center whitespace-nowrap w-[110px]">
                    <ActionIconGroup
                      confirming={disableState.confirming}
                      onEdit={() => handleEditClick(client)}
                      onRequestDelete={() => requestDelete(client.id)}
                      onConfirm={async () => {
                        await confirmDelete(client.id, () => handleDeleteById(client.id));
                      }}
                      onCancel={cancelDelete}
                      disabled={!canManageClients}
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
