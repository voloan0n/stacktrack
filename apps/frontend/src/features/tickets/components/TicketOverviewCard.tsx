"use client";

import React, { useEffect, useState } from "react";
import Button from "@/shared/components/ui/button/Button";
import ChartTab from "@/shared/components/common/ChartTab";
import CardHeader from "@/shared/components/common/CardHeader";
import AssigneeMiniList from "./AssigneeMiniList";
import { type TimelineEntry } from "@/shared/components/common/TimelineItem";
import TicketTimelinePanel from "./TicketTimelinePanel";
import TicketNoteComposer, {
  type BillableStatus,
} from "@/features/tickets/components/TicketNoteComposer";
import Select from "@/shared/components/form/Select";
import { fetchAssignableUsers } from "@/features/tickets/services/assignableUsers";

type TicketOverviewCardProps = {
  ticket: any;
  statusOptions: { value: string; label: string }[];
  currentStatusKey?: string;
  statusEntries?: TimelineEntry[];
  noteEntries?: TimelineEntry[];
  activityBadgeText?: string;
  canUpdateTicket: boolean;
  startTime?: string;
  endTime?: string;
  supportType?: string;
  billableStatus?: BillableStatus;
  durationLabel?: string;
  canCommentTicket?: boolean;
  handleReply?: () => void | boolean | Promise<void | boolean>;
  loadingNoteId?: string | null;
  setStartTime?: (value: string) => void;
  setEndTime?: (value: string) => void;
  setSupportType?: (value: string) => void;
  setBillableStatus?: (value: BillableStatus) => void;
  noteStatusUpdate?: string;
  setNoteStatusUpdate?: (value: string) => void;
  internalOnly?: boolean;
  setInternalOnly?: (value: boolean) => void;
  reply?: string;
  setReply?: (value: string) => void;
  supportOptions?: { value: string; label: string }[];
  billableOptions?: { value: string; label: string }[];
  assignees?: any[];
  canAssignTicket: boolean;
  onAssignUser?: (
    mode: "add" | "transfer",
    user: { id: string; name: string }
  ) => void | Promise<void>;
};

export default function TicketOverviewCard({
  ticket,
  statusOptions,
  currentStatusKey,
  statusEntries = [],
  noteEntries = [],
  activityBadgeText,
  canUpdateTicket,
  startTime,
  endTime,
  supportType,
  billableStatus,
  durationLabel,
  canCommentTicket,
  handleReply,
  loadingNoteId,
  setStartTime,
  setEndTime,
  setSupportType,
  setBillableStatus,
  noteStatusUpdate,
  setNoteStatusUpdate,
  internalOnly,
  setInternalOnly,
  reply,
  setReply,
  supportOptions,
  billableOptions,
  assignees,
  canAssignTicket,
  onAssignUser,
}: TicketOverviewCardProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "log">("notes");

  const headerTitle = ticket.title || "Untitled ticket";
  const ticketNumber =
    ticket?.displayId ?? ticket?.number ?? ticket?.ticketNumber ?? ticket?.id;
  const headerEyebrow = ticketNumber ? `Ticket ${ticketNumber}` : "Ticket";

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ ticketId?: string | null; tab?: string }>;
      const requestedTab = customEvent.detail?.tab;
      const requestedTicketId = customEvent.detail?.ticketId;
      if (!requestedTab) return;
      if (requestedTicketId && String(requestedTicketId) !== String(ticket?.id)) return;
      if (requestedTab === "notes" || requestedTab === "log") setActiveTab(requestedTab);
    };

    window.addEventListener("stacktrack:ticket-tab", handler as EventListener);
    return () => window.removeEventListener("stacktrack:ticket-tab", handler as EventListener);
  }, [ticket?.id]);

  const handleSaveAndViewLog = async () => {
    const didSave = await handleReply?.();
    if (didSave === false) return;
    if (didSave) setActiveTab("log");
  };

  const logEntries = [...statusEntries, ...noteEntries];
  const sortedLogEntries = [...logEntries].sort((a, b) => {
    const timeCompare = (b.createdAt || "").localeCompare(a.createdAt || "");
    if (timeCompare !== 0) return timeCompare;
    const rank = (kind?: string) =>
      kind === "divider" ? 2 : kind === "activity" ? 1 : 0;
    return rank((b as any).kind) - rank((a as any).kind);
  });

  return (
    <div className="h-full overflow-hidden rounded-2xl border border-app bg-app-subtle shadow-theme-xs">
      <CardHeader
        eyebrow={headerEyebrow}
        title={headerTitle}
        className="px-4 py-3"
      >
        <ChartTab
          tabs={[
            { key: "notes", label: "Notes" },
            { key: "log", label: "Log" },
          ]}
          defaultKey={activeTab}
          onChange={(key) => setActiveTab(key as typeof activeTab)}
        />
      </CardHeader>

      <div className="flex h-full min-h-0 flex-col px-4 py-4">
        {/* NOTES TAB */}
        {activeTab === "notes" && (
          <TicketNotesTab
            durationLabel={durationLabel}
            startTime={startTime}
            endTime={endTime}
            supportType={supportType}
            billableStatus={billableStatus}
            canCommentTicket={canCommentTicket}
            canUpdateTicket={canUpdateTicket}
            currentStatusKey={currentStatusKey}
            supportOptions={supportOptions}
            billableOptions={billableOptions}
            statusOptions={statusOptions}
            statusUpdate={noteStatusUpdate || ""}
            setStatusUpdate={setNoteStatusUpdate || (() => {})}
            internalOnly={internalOnly ?? false}
            setInternalOnly={setInternalOnly || (() => {})}
            reply={reply || ""}
            setReply={setReply || (() => {})}
            handleReply={handleSaveAndViewLog}
            loadingNoteId={loadingNoteId}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            setSupportType={setSupportType}
            setBillableStatus={setBillableStatus}
            assignees={assignees}
            canAssignTicket={canAssignTicket}
            onAssignUser={onAssignUser}
          />
        )}

        {/* LOG TAB */}
        {activeTab === "log" && (
          <TicketLogTab
            entries={sortedLogEntries}
            activityBadgeText={activityBadgeText}
          />
        )}
      </div>
    </div>
  );
}

type TicketNotesTabProps = {
  durationLabel?: string;
  startTime?: string;
  endTime?: string;
  supportType?: string;
  billableStatus?: BillableStatus;
  canCommentTicket?: boolean;
  canUpdateTicket: boolean;
  currentStatusKey?: string;
  supportOptions?: { value: string; label: string }[];
  billableOptions?: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  statusUpdate: string;
  setStatusUpdate: (value: string) => void;
  internalOnly: boolean;
  setInternalOnly: (value: boolean) => void;
  reply: string;
  setReply: (value: string) => void;
  handleReply: () => void | boolean | Promise<void | boolean>;
  loadingNoteId?: string | null;
  setStartTime?: (value: string) => void;
  setEndTime?: (value: string) => void;
  setSupportType?: (value: string) => void;
  setBillableStatus?: (value: BillableStatus) => void;
  assignees?: any[];
  canAssignTicket: boolean;
  onAssignUser?: (
    mode: "add" | "transfer",
    user: { id: string; name: string }
  ) => void | Promise<void>;
};

export function TicketNotesTab({
  durationLabel,
  startTime,
  endTime,
  supportType,
  billableStatus,
  canCommentTicket,
  canUpdateTicket,
  currentStatusKey,
  supportOptions,
  billableOptions,
  statusOptions,
  statusUpdate,
  setStatusUpdate,
  internalOnly,
  setInternalOnly,
  reply,
  setReply,
  handleReply,
  loadingNoteId,
  setStartTime,
  setEndTime,
  setSupportType,
  setBillableStatus,
  assignees,
  canAssignTicket,
  onAssignUser,
}: TicketNotesTabProps) {
  return (
    <div className="flex-1 min-h-0 overflow-auto space-y-4">
      <TicketNoteComposer
        durationLabel={durationLabel}
        startTime={startTime || ""}
        endTime={endTime || ""}
        supportType={supportType || ""}
        billableStatus={billableStatus ?? ""}
        canCommentTicket={canCommentTicket !== false}
        canUpdateTicket={canUpdateTicket}
        currentStatusKey={currentStatusKey}
        supportOptions={supportOptions || []}
        billableOptions={billableOptions || []}
        statusOptions={statusOptions || []}
        statusUpdate={statusUpdate}
        setStatusUpdate={setStatusUpdate}
        internalOnly={internalOnly}
        setInternalOnly={setInternalOnly}
        reply={reply}
        setReply={setReply}
        onSubmit={handleReply}
        loading={loadingNoteId !== null}
        setStartTime={setStartTime || (() => {})}
        setEndTime={setEndTime || (() => {})}
        setSupportType={setSupportType || (() => {})}
        setBillableStatus={setBillableStatus || (() => {})}
      />

      <TicketAssigneesInlineCard
        assignees={assignees}
        canAssignTicket={canAssignTicket}
        onAssignUser={onAssignUser}
      />
    </div>
  );
}

type TicketAssigneesInlineCardProps = {
  assignees?: any[];
  canAssignTicket: boolean;
  onAssignUser?: (
    mode: "add" | "transfer",
    user: { id: string; name: string }
  ) => void | Promise<void>;
};

function TicketAssigneesInlineCard({
  assignees,
  canAssignTicket,
  onAssignUser,
}: TicketAssigneesInlineCardProps) {
  const [mode, setMode] = useState<"add" | "transfer" | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; label: string }>>(
    []
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadUsers = async () => {
    if (users.length) return;
    setLoadingUsers(true);
    try {
      const data = await fetchAssignableUsers();
      setUsers(
        (data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          label: u.name,
        }))
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleStartAssign = async (nextMode: "add" | "transfer") => {
    if (!canAssignTicket) return;
    setMode(nextMode);
    setSelectedUserId("");
    await loadUsers();
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleSaveAssign = async () => {
    const chosen = users.find((u) => u.id === selectedUserId);
    if (!chosen || !mode || !onAssignUser) return;

    setAssigning(true);
    try {
      await onAssignUser(mode, { id: chosen.id, name: chosen.name });
      setMode(null);
      setSelectedUserId("");
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelAssign = () => {
    setMode(null);
    setSelectedUserId("");
  };

  return (
    <section className="rounded-xl border border-app bg-app px-4 py-4 text-sm text-app shadow-theme-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
            ASSIGNEE
          </p>
          <AssigneeMiniList
            assignees={assignees}
            maxVisible={5}
            avatarSize="sm"
            emptyLabel="No user assigned"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode ? (
            <div className="min-w-[200px] max-w-[220px]">
              <Select
                options={users.map((u) => ({ value: u.id, label: u.label }))}
                value={selectedUserId}
                onChange={(v) => handleSelectUser(v)}
                disabled={!canAssignTicket || loadingUsers || assigning}
                className="max-w-[220px]"
                placeholder={
                  loadingUsers
                    ? "Loading users..."
                    : mode === "transfer"
                      ? "Transfer to..."
                      : "Assign to..."
                }
              />
            </div>
          ) : null}
          {mode ? (
            <>
              <Button
                size="sm"
                onClick={handleSaveAssign}
                disabled={
                  !canAssignTicket || assigning || loadingUsers || !selectedUserId
                }
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAssign}
                disabled={assigning}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => handleStartAssign("add")}
                disabled={!canAssignTicket || assigning}
              >
                Add Assignee
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartAssign("transfer")}
                disabled={!canAssignTicket || assigning}
              >
                Transfer
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type TicketLogTabProps = {
  entries?: TimelineEntry[];
  activityBadgeText?: string;
};

export function TicketLogTab({
  entries = [],
  activityBadgeText,
}: TicketLogTabProps) {
  return (
    <TicketTimelinePanel
      entries={entries}
      pageSize={11}
      countKind="note"
      eyebrow="Log"
      title="Updates & status changes"
      headerRight={
        <div className="flex items-center gap-2 self-center">
          {activityBadgeText ? (
            <span className="rounded-full bg-app-subtle px-3 py-1 text-xs font-medium text-app">
              {activityBadgeText}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (typeof window === "undefined") return;
              window.dispatchEvent(
                new CustomEvent("stacktrack:ticket-tab", { detail: { tab: "notes" } })
              );
            }}
          >
            Add Note
          </Button>
        </div>
      }
      emptyText="No activity recorded yet."
    />
  );
}
