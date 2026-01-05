"use client";

// =========================================================
// Imports
// =========================================================
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TicketOverviewCard from "@/features/tickets/components/TicketOverviewCard";
import TicketSidebarPanel from "@/features/tickets/components/TicketSidebarPanel";
import PageBreadcrumb from "@/shared/components/common/PageBreadCrumb";
import TicketForm from "@/features/tickets/components/TicketForm";
import {
  addNote,
  assignTicket,
  createTicket,
  updateTicket,
  updateTicketStatus,
} from "@/features/tickets/hooks/useTicketActions";
import { useTicketData } from "@/features/tickets/hooks/useTicketData";
import { useAuth } from "@/features/auth/lib/provider";
import { computeNextActionDue } from "@/features/tickets/utils/deadlines";
import { formatDuration } from "@/features/tickets/utils/time";
import usePermissions from "@/shared/hooks/usePermissions";
import type { TimelineEntry } from "@/shared/components/common/TimelineItem";

// =========================================================
// Types
// =========================================================
type NoteEntry = {
  id: string;
  name: string;
  email?: string;
  roleLabel?: string | null;
  avatarColor?: string;
  createdAt: string | null;
  body: string;
  kind?: "note" | "divider";
  dividerType?: "status" | "assignee" | "transfer";
  supportType?: string | null;
  durationMin?: number | null;
  billable?: string | null;
  internal?: boolean | null;
  type?: "note";
  timeTrackingId?: string | null;
};

type TimeEntry = {
  id?: string;
  title?: string;
  comment?: string;
  createdAt?: string | null;
  durationMin?: number | null;
  billable?: boolean | null;
  user?: { id?: string; name?: string; email?: string; avatarColor?: string | null };
};

type BillableStatus = string;

// =========================================================
// Page
// =========================================================
export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id as string;

  const { user } = useAuth() || { user: null };
  const { can } = usePermissions(user?.permissions);
  const canViewTickets = can("ticket.view");
  const { ticket, loading, error, refetchTickets } = useTicketData(
    ticketId,
    1,
    20,
    { enabled: canViewTickets }
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);

  const canUpdateTicket = can("ticket.update");
  const canAssignTicket = can("ticket.assign");
  const canCreateTicket = can("ticket.create");
  const canCommentTicket =
    user?.canCommentTicket ?? can("ticket.comment");

  if (!canViewTickets) {
    return (
      <div className="space-y-3">
        <PageBreadcrumb pageTitle="Ticket" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-100">
          You do not have permission to view tickets.
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-gray-600 dark:text-gray-400">Loading ticket…</p>;
  }

  if (error || !ticket) {
    return <p className="text-red-500">Ticket not found</p>;
  }

  const openTicketDetailsModal = () => {
    setActiveTicket({
      id: ticket.id,
      title: ticket.title,
      status: (ticket.status || "").toLowerCase(),
      priority: (ticket.priority || "").toLowerCase(),
      type: (ticket.type || "").toLowerCase(),
      internalOnly: Boolean(ticket.internalOnly),
      clientId: ticket.client?.id,
      client: {
        id: ticket.client?.id,
        name: ticket.client?.name,
        email: ticket.client?.email,
        phone: ticket.client?.phone,
      },
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        pageTitle="Ticket"
        pageSubtitle={ticket.title}
        items={[
          { label: "Support Tickets", href: "/tickets" },
          { label: `Ticket ${ticket.displayId}`, href: `/tickets/${ticket.id}` },
        ]}
      />

      <TicketDetailContent
        ticket={ticket}
        user={user}
        canUpdateTicket={canUpdateTicket}
        canAssignTicket={canAssignTicket}
        canCommentTicket={canCommentTicket}
        onShowTicketDetails={openTicketDetailsModal}
      />

      <TicketForm
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveTicket(null);
        }}
        onSave={async (data) => {
          await handleSaveTicket(data);
          await refetchTickets();
        }}
        ticket={activeTicket ?? undefined}
        canAssign={canAssignTicket}
        canUpdate={canUpdateTicket}
        canCreate={canCreateTicket}
      />
    </div>
  );

  async function handleSaveTicket(data: any) {
    try {
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
    } finally {
      setModalOpen(false);
      setActiveTicket(null);
    }
  }
}

function TicketDetailContent({
  ticket,
  user,
  canUpdateTicket,
  canAssignTicket,
  canCommentTicket,
  onShowTicketDetails,
}: {
  ticket: any;
  user: any;
  canUpdateTicket: boolean;
  canAssignTicket: boolean;
  canCommentTicket: boolean;
  onShowTicketDetails: () => void;
}) {
  const parseActivityDivider = (text: string) => {
    const match = text.match(/^\[\[stacktrack:(status|assignee|transfer)\]\]\s*(.+)$/s);
    if (!match) return null;
    return {
      type: match[1] as "status" | "assignee" | "transfer",
      body: (match[2] || "").trim(),
    };
  };

  const createActivityDividerText = (
    type: "status" | "assignee" | "transfer",
    body: string
  ) => `[[stacktrack:${type}]] ${body}`;

  /* ---------------- Draft state ---------------- */
  const initialStatusKey = (ticket.status || "").toLowerCase().replace(/\s+/g, "_");

  const [, setStatus] = useState(initialStatusKey);
  const [statusDraft, setStatusDraft] = useState(initialStatusKey);

  /* ---------------- Notes (unchanged) ---------------- */
  const [notes, setNotes] = useState<NoteEntry[]>(() =>
    (ticket.comments || []).map((c: any) => ({
      ...(parseActivityDivider(c.body || c.text || "")
        ? {
            kind: "divider",
            dividerType: parseActivityDivider(c.body || c.text || "")!.type,
            body: parseActivityDivider(c.body || c.text || "")!.body,
          }
        : {}),
      id: c.id,
      name: c.user?.name || "Unknown user",
      email: c.user?.email,
      roleLabel: c.user?.role || null,
      avatarColor: c.user?.avatarColor || undefined,
      createdAt: c.createdAt || null,
      body: parseActivityDivider(c.body || c.text || "")?.body || c.body || c.text || "",
      supportType: null,
      durationMin: null,
      billable: null,
      internal: typeof c.internalOnly === "boolean" ? c.internalOnly : null,
      type: "note",
      timeTrackingId: null,
    }))
  );
  const [, setTimeEntries] = useState<TimeEntry[]>(ticket.timeTracking || []);

  const [reply, setReply] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [supportType, setSupportType] = useState("");
  const [billableStatus, setBillableStatus] = useState<BillableStatus>("");
  const [noteStatusUpdate, setNoteStatusUpdate] = useState(initialStatusKey);
  const [internalOnly, setInternalOnly] = useState(false);
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null);
  const [supportOptions, setSupportOptions] = useState<any[]>([]);
  const [billableOptions, setBillableOptions] = useState<any[]>([]);
  const [statusDeadlineMap, setStatusDeadlineMap] = useState<Record<string, number>>({});

  const parseTimeToMinutes = (value: string) => {
    if (!value) return null;
    const [hour, minute] = value.split(":").map((part) => Number(part));
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };

  const computeDurationMinFromTimes = (start?: string, end?: string) => {
    const startMinutes = parseTimeToMinutes(start || "");
    const endMinutes = parseTimeToMinutes(end || "");
    if (startMinutes === null || endMinutes === null) return null;
    const diff = endMinutes - startMinutes;
    return diff > 0 ? diff : null;
  };

  const durationLabel = useMemo(() => {
    const minutes = computeDurationMinFromTimes(startTime, endTime);
    return minutes ? formatDuration(minutes) : "";
  }, [startTime, endTime]);

  const statusLogEntriesState = useState<TimelineEntry[]>([]);
  const [statusLogEntries, setStatusLogEntries] = statusLogEntriesState;

  const resolveStatusLabel = (key: string) => {
    const match = statusOptions.find((o) => o.value === key);
    return match?.label || key;
  };

  const pushDividerEntry = ({
    body,
    type,
    createdAt,
  }: {
    body: string;
    type: "status" | "assignee" | "transfer";
    createdAt?: string;
  }) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `divider-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setStatusLogEntries((prev) => [
      {
        id,
        createdAt: createdAt ?? new Date().toISOString(),
        body,
        type,
        kind: "divider",
      },
      ...prev,
    ]);
  };

  const handleReply = async (): Promise<boolean> => {
    const shouldPostNote = reply.trim().length > 0 && canCommentTicket;
    const shouldUpdateStatus =
      noteStatusUpdate.trim().length > 0 &&
      canUpdateTicket &&
      noteStatusUpdate !== statusDraft;

    if (!shouldPostNote && !shouldUpdateStatus) return false;

    setLoadingNoteId(shouldPostNote ? "adding-note" : "updating-status");

    const durationMin = computeDurationMinFromTimes(startTime, endTime);
    try {
      if (shouldUpdateStatus) {
        await updateTicketStatus(ticket.id, noteStatusUpdate);
        setStatus(noteStatusUpdate);
        setStatusDraft(noteStatusUpdate);
      }

      const billableFlag =
        billableStatus === "billable"
          ? true
          : billableStatus === "non_billable"
            ? false
            : undefined;

      const response = shouldPostNote
        ? await addNote({
            id: ticket.id,
            text: reply.trim(),
            durationMin: durationMin ?? undefined,
            billable: billableFlag,
            billingType: billableStatus || null,
            supportType: supportType || undefined,
            status: null,
            internal: internalOnly,
          })
        : null;

      const comment = response?.comment;
      const timeTracking = response?.timeTracking;
      const meta = response?.meta || {};
      const billableSelected = billableStatus !== "";

      let noteCreatedAt: string | null = null;
      if (comment) {
        noteCreatedAt = comment.createdAt || new Date().toISOString();
        const newNote: NoteEntry = {
          id: comment.id,
          name: comment.user?.name || "Unknown user",
          email: comment.user?.email,
          roleLabel: comment.user?.role || null,
          avatarColor: comment.user?.accentColor || undefined,
          createdAt: noteCreatedAt,
          body: comment.text || reply,
          kind: "note",
          supportType: meta.supportType || supportType || null,
          durationMin: meta.durationMin ?? durationMin ?? null,
          billable:
            billableSelected
              ? typeof meta.billingType === "string" && meta.billingType.trim().length > 0
                ? meta.billingType
                : typeof meta.billable === "boolean"
                  ? meta.billable
                    ? "billable"
                    : "non_billable"
                  : billableStatus
              : null,
          internal:
            typeof meta.internal === "boolean"
              ? meta.internal
              : typeof meta.internalOnly === "boolean"
                ? meta.internalOnly
                : internalOnly,
          type: "note",
          timeTrackingId: timeTracking?.id ?? null,
        };

        setNotes((prev) => [newNote, ...prev]);
      }

      if (shouldUpdateStatus) {
        const toKey = noteStatusUpdate;
        const toLabel = resolveStatusLabel(toKey);
        const by = user?.role || user?.name || "StackTrack admin";
        if (canCommentTicket) {
          const activityBody = `Set ${toLabel} By ${by}`;
          const activity = await addNote({
            id: ticket.id,
            text: createActivityDividerText("status", activityBody),
            internal: true,
          });
          const activityComment = activity?.comment;
          if (activityComment) {
            setNotes((prev) => [
              {
                id: activityComment.id,
                name: activityComment.user?.name || "Unknown user",
                email: activityComment.user?.email,
                roleLabel: activityComment.user?.role || null,
                avatarColor: activityComment.user?.accentColor || undefined,
                createdAt: activityComment.createdAt || new Date().toISOString(),
                body: activityBody,
                kind: "divider",
                dividerType: "status",
                supportType: null,
                durationMin: null,
                billable: null,
                internal: true,
                type: "note",
                timeTrackingId: null,
              },
              ...prev,
            ]);
          }
        } else {
          let createdAt = new Date().toISOString();
          if (noteCreatedAt) {
            const base = Date.parse(noteCreatedAt);
            createdAt = new Date(
              (Number.isNaN(base) ? Date.now() : base) + 1
            ).toISOString();
          }
          pushDividerEntry({
            type: "status",
            body: `Set ${toLabel} By ${by}`,
            createdAt,
          });
        }
      }

      if (timeTracking) {
        setTimeEntries((prev) => [timeTracking, ...prev]);
      }

      setReply("");
      setStartTime("");
      setEndTime("");
      setSupportType("");
      setBillableStatus("");
      setNoteStatusUpdate(shouldUpdateStatus ? noteStatusUpdate : statusDraft);
      setInternalOnly(false);
      return true;
    } catch (err) {
      console.error("Unable to add note", err);
      return false;
    } finally {
      setLoadingNoteId(null);
    }
  };

  /* ---------------- Options ---------------- */
  const [statusOptions, setStatusOptions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/proxy/ticket-options", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const nextDeadlines: Record<string, number> = {};
        (data.statuses || []).forEach((s: any) => {
          if (typeof s?.key === "string" && typeof s?.nextActionDueHours === "number") {
            nextDeadlines[s.key] = s.nextActionDueHours;
          }
        });
        setStatusDeadlineMap(nextDeadlines);

        setStatusOptions(
          (data.statuses || []).map((s: any) => ({
            value: s.key,
            label: s.label,
          }))
        );

        setSupportOptions(
          Array.isArray(data.supportTypes)
            ? data.supportTypes.map((t: any) => ({ value: t.key, label: t.label }))
            : []
        );

        setBillableOptions(
          Array.isArray(data.billingTypes)
            ? data.billingTypes.map((t: any) => ({ value: t.key, label: t.label }))
            : []
        );
      })
      .catch(() => {});
  }, []);

  /* ---------------- Derived ---------------- */
  const nextActionDue = computeNextActionDue({
    ...ticket,
    status: statusDraft,
  }, statusDeadlineMap);

  const noteEntries: TimelineEntry[] = notes.map((n) =>
    n.kind === "divider"
      ? ({
          id: n.id,
          createdAt: n.createdAt,
          body: n.body,
          kind: "divider",
          type: n.dividerType || "status",
        } satisfies TimelineEntry)
      : ({
          id: n.id,
          name: n.name,
          email: n.email,
          roleLabel: n.roleLabel,
          avatarColor: n.avatarColor,
          createdAt: n.createdAt,
          body: n.body,
          supportType: n.supportType,
          durationMin: n.durationMin,
          billable: n.billable,
          internal: n.internal,
          type: n.type,
          timeTrackingId: n.timeTrackingId,
          kind: "note",
        } satisfies TimelineEntry)
  );

  const statusEntries: TimelineEntry[] = statusLogEntries;

  const [assignees, setAssignees] = useState<any[]>(ticket.assignees || []);

  useEffect(() => {
    setAssignees(ticket.assignees || []);
  }, [ticket.assignees]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full lg:w-1/3">
        <TicketSidebarPanel
          ticketId={ticket.id}
          internalOnly={Boolean(ticket.internalOnly)}
          openedByName={
            ticket.createdBy?.name ||
            ticket.createdBy?.fullName ||
            ticket.requester?.name ||
            ticket.requester?.fullName ||
            null
          }
          openedByEmail={
            ticket.createdBy?.email ||
            ticket.requester?.email ||
            null
          }
          openedByPhone={ticket.createdBy?.phone || ticket.requester?.phone || null}
          requesterName={ticket.client?.name}
          requesterEmail={ticket.client?.email}
          requesterPhone={ticket.client?.phone}
          clientAddressCity={ticket.client?.city}
          clientAddressState={ticket.client?.state}
          quickNotes={ticket.quickNotes}
          nextActionDue={nextActionDue}
          onShowTicketDetails={onShowTicketDetails}
        />
      </div>

      <div className="flex-1">
        <TicketOverviewCard
          ticket={ticket}
          statusOptions={statusOptions}
          currentStatusKey={statusDraft}
          canUpdateTicket={canUpdateTicket}
          assignees={assignees}
          canAssignTicket={canAssignTicket}
          onAssignUser={async (mode, selectedUser) => {
            const actor = user?.role || user?.name || "StackTrack admin";
            const previousAssignees = assignees;

            setAssignees((prev) => {
              const exists = (prev || []).some((entry: any) => {
                const raw = entry?.user || entry;
                return (
                  String(raw?.id || raw?.userId || "") === String(selectedUser.id)
                );
              });

              if (mode === "transfer") {
                return [{ id: selectedUser.id, name: selectedUser.name }];
              }

              if (exists) return prev;
              return [{ id: selectedUser.id, name: selectedUser.name }, ...(prev || [])];
            });

            let updatedTicket: any = null;
            try {
              const res = await assignTicket(ticket.id, selectedUser.id, mode);
              updatedTicket = (res as any)?.ticket ?? res;
            } catch (error) {
              setAssignees(previousAssignees);
              throw error;
            }

            if (Array.isArray(updatedTicket?.assignees) && updatedTicket.assignees.length) {
              setAssignees(updatedTicket.assignees);
            }
            const verb = mode === "transfer" ? "Transferred to" : "Assigned";
            const activityType = mode === "transfer" ? "transfer" : "assignee";
            const activityBody = `${verb} ${selectedUser.name} By ${actor}`;

            if (canCommentTicket) {
              const activity = await addNote({
                id: ticket.id,
                text: createActivityDividerText(activityType, activityBody),
                internal: true,
              });
              const activityComment = activity?.comment;
              if (activityComment) {
                setNotes((prev) => [
                  {
                    id: activityComment.id,
                    name: activityComment.user?.name || "Unknown user",
                    email: activityComment.user?.email,
                    roleLabel: activityComment.user?.role || null,
                    avatarColor: activityComment.user?.accentColor || undefined,
                    createdAt:
                      activityComment.createdAt || new Date().toISOString(),
                    body: activityBody,
                    kind: "divider",
                    dividerType: activityType,
                    supportType: null,
                    durationMin: null,
                    billable: null,
                    internal: true,
                    type: "note",
                    timeTrackingId: null,
                  },
                  ...prev,
                ]);
              }
              return;
            }

            pushDividerEntry({
              type: activityType,
              body: activityBody,
            });
          }}
          durationLabel={durationLabel}
          startTime={startTime}
          endTime={endTime}
          supportType={supportType}
          billableStatus={billableStatus}
          noteStatusUpdate={noteStatusUpdate}
          setNoteStatusUpdate={setNoteStatusUpdate}
          internalOnly={internalOnly}
          setInternalOnly={setInternalOnly}
          canCommentTicket={canCommentTicket}
          supportOptions={supportOptions}
          billableOptions={billableOptions}
          reply={reply}
          setReply={setReply}
          handleReply={handleReply}
          loadingNoteId={loadingNoteId}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          setSupportType={setSupportType}
          setBillableStatus={setBillableStatus}
          noteEntries={noteEntries}
          statusEntries={statusEntries}
        />
      </div>
    </div>
  );
}
