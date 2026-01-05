"use client";

import React from "react";
import Label from "@/shared/components/form/Label";
import Input from "@/shared/components/form/input/InputField";
import Select from "@/shared/components/form/Select";
import TextArea from "@/shared/components/form/input/TextArea";
import Button from "@/shared/components/ui/button/Button";
import Checkbox from "@/shared/components/form/input/Checkbox";

export type BillableStatus = string;

export type TicketNoteComposerProps = {
  durationLabel?: string;
  startTime: string;
  endTime: string;
  supportType: string;
  billableStatus: BillableStatus;
  canCommentTicket: boolean;
  canUpdateTicket: boolean;
  currentStatusKey?: string;
  supportOptions: { value: string; label: string }[];
  billableOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  statusUpdate: string;
  setStatusUpdate: (value: string) => void;
  internalOnly: boolean;
  setInternalOnly: (value: boolean) => void;
  reply: string;
  setReply: (value: string) => void;
  onSubmit: () => void | boolean | Promise<void | boolean>;
  loading: boolean;
  setStartTime: (value: string) => void;
  setEndTime: (value: string) => void;
  setSupportType: (value: string) => void;
  setBillableStatus: (value: BillableStatus) => void;
};

export default function TicketNoteComposer({
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
  onSubmit,
  loading,
  setStartTime,
  setEndTime,
  setSupportType,
  setBillableStatus,
}: TicketNoteComposerProps) {
  const parseTimeToMinutes = (value: string) => {
    if (!value) return null;
    const [hour, minute] = value.split(":").map((part) => Number(part));
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const hasValidTimes = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;
  const hasInvalidTimes =
    startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes;

  const hasStatusChange =
    canUpdateTicket &&
    statusUpdate.trim().length > 0 &&
    (!currentStatusKey || statusUpdate !== currentStatusKey);
  const hasChanges =
    (canCommentTicket && reply.trim().length > 0) ||
    hasStatusChange;

  return (
    <section className="space-y-4 rounded-xl border border-app bg-app px-4 py-4 text-sm text-app shadow-theme-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
            Notes
          </p>
        </div>

        <span className="rounded-full bg-app-subtle px-3 py-1 text-xs font-medium text-app">
          Duration: {durationLabel || "—"}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Support type</Label>
              <Select
                options={supportOptions}
                value={supportType}
                onChange={(v) => setSupportType(v)}
                disabled={!canCommentTicket}
                placeholder="Select type"
              />
            </div>

            <div className="space-y-2">
              <Label>Billing type</Label>
              <Select
                options={billableOptions}
                value={billableStatus}
                onChange={(v) => setBillableStatus(String(v || ""))}
                disabled={!canCommentTicket}
                placeholder="Select"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!canCommentTicket}
                error={hasInvalidTimes}
                success={Boolean(startTime) && !hasInvalidTimes}
              />
            </div>

            <div className="space-y-2">
              <Label>End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={startTime || undefined}
                disabled={!canCommentTicket}
                error={hasInvalidTimes}
                success={Boolean(endTime) && hasValidTimes}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <TextArea
            placeholder="Write a note for the ticket…"
            rows={4}
            value={reply}
            onChange={setReply}
            disabled={!canCommentTicket}
            success={Boolean(reply.trim())}
          />
          {canCommentTicket ? null : (
            <p className="text-xs text-app-muted">
              You don&apos;t have permission to add notes.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-[240px] items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-app-muted">
              Status:
            </span>
            <div className="flex-1">
              <Select
                options={statusOptions}
                value={statusUpdate}
                onChange={(v) => setStatusUpdate(v)}
                disabled={!canUpdateTicket}
                placeholder="Select"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={internalOnly}
                onChange={setInternalOnly}
                disabled={!canCommentTicket}
              />
              <span className="text-xs uppercase tracking-[0.2em] text-app-muted">
                Internal only
              </span>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={onSubmit}
              disabled={!hasChanges || loading}
              className="h-11"
            >
              {loading ? "Saving…" : "Add Note"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
