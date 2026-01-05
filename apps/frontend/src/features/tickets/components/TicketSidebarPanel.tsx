"use client";

import React, { useEffect, useRef, useState } from "react";
import UserIcon from "@/shared/components/ui/avatar/UserIcon";
import Button from "@/shared/components/ui/button/Button";
import CardHeader from "@/shared/components/common/CardHeader";
import { formatDateTime } from "@/features/tickets/utils/time";
import Alert from "@/shared/components/ui/alert/Alert";
import { getPhoneDisplayAndHref } from "@/shared/utils/phone";
import { formatCityState } from "@/shared/utils/location";
import TextArea from "@/shared/components/form/input/TextArea";
import { updateTicket } from "@/features/tickets/hooks/useTicketActions";

type TicketSidebarPanelProps = {
  ticketId: string;
  internalOnly?: boolean;
  openedByName?: string | null;
  openedByEmail?: string | null;
  openedByPhone?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  clientAddressCity?: string | null;
  clientAddressState?: string | null;
  quickNotes?: string | null;
  nextActionDue?: Date | null;
  onShowTicketDetails?: () => void;
};

type DeadlineVariant = "success" | "warning" | "error" | "info";

const resolveDeadlineVariant = (due?: Date | null): DeadlineVariant | null => {
  if (!due) return null;
  const now = new Date();
  const target = new Date(due);
  if (Number.isNaN(target.getTime())) return null;

  const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffHours < 0) return "error";

  const sameDay =
    now.getFullYear() === target.getFullYear() &&
    now.getMonth() === target.getMonth() &&
    now.getDate() === target.getDate();

  if (!sameDay) return "info";
  if (diffHours <= 3) return "warning";
  return "success";
};

export default function TicketSidebarPanel({
  ticketId,
  internalOnly = false,
  openedByName,
  openedByEmail,
  openedByPhone,
  requesterName,
  requesterEmail,
  requesterPhone,
  clientAddressCity,
  clientAddressState,
  quickNotes,
  nextActionDue,
  onShowTicketDetails,
}: TicketSidebarPanelProps) {
  const deadlineVariant = resolveDeadlineVariant(nextActionDue);
  const [quickNotesDraft, setQuickNotesDraft] = useState(quickNotes || "");
  const savingRef = useRef(false);
  const lastSavedRef = useRef<string>(quickNotes || "");

  useEffect(() => {
    const next = quickNotes || "";
    setQuickNotesDraft(next);
    lastSavedRef.current = next;
  }, [quickNotes]);

  const requestTicketTab = (tab: "notes" | "log") => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("stacktrack:ticket-tab", {
        detail: { ticketId, tab },
      })
    );
  };

  const name = (internalOnly ? openedByName : requesterName)?.trim() || "Client";
  const email = (internalOnly ? openedByEmail : requesterEmail)?.trim() || "";
  const phone = (internalOnly ? openedByPhone : requesterPhone)?.trim() || "";

  const { display: phoneDisplay, href: phoneHref } = getPhoneDisplayAndHref(phone);
  const emailHref = email ? `mailto:${email}` : undefined;

  const headerEyebrow = internalOnly
    ? "Internal"
    : formatCityState(clientAddressCity, clientAddressState) ||
      clientAddressCity?.trim() ||
      "Client";

  const saveQuickNotes = async () => {
    const next = quickNotesDraft;
    if (savingRef.current) return;
    if (next === lastSavedRef.current) return;
    savingRef.current = true;
    try {
      await updateTicket(ticketId, { quickNotes: next });
      lastSavedRef.current = next;
    } catch (err) {
      console.error("Failed to save quick notes", err);
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-app bg-app-subtle shadow-theme-xs">
      <CardHeader
        eyebrow={headerEyebrow}
        title={name}
        description={undefined}
        icon={<UserIcon name={name} color="light" size="lg" />}
        className="px-5 py-4"
      />

      <div className="px-5 py-5 space-y-5">
        {/* ========================================================= */}
        {/*                        CONTACT INFO                        */}
        {/* ========================================================= */}
        <div className="space-y-4 text-xs text-app-muted">
          {/* PHONE */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-app">Preferred phone</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full max-w-xs rounded-lg bg-app px-3 py-2">
                {phoneHref ? (
                  <a href={phoneHref} className="text-sm text-app underline">
                    {phoneDisplay}
                  </a>
                ) : (
                  <p className="text-sm text-app">{phoneDisplay}</p>
                )}
              </div>
            </div>
          </div>

          {/* EMAIL */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-app">Preferred email</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full max-w-xs rounded-lg bg-app px-3 py-2">
                {emailHref ? (
                  <a href={emailHref} className="break-all text-sm text-app underline">
                    {email}
                  </a>
                ) : (
                  <p className="break-all text-sm text-app">{email || "—"}</p>
                )}
              </div>
            </div>
          </div>

          {/* QUICK NOTES */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-app">Quick notes</p>
            <TextArea
              rows={2}
              value={quickNotesDraft}
              onChange={(value) => setQuickNotesDraft(value)}
              onBlur={() => void saveQuickNotes()}
              placeholder="Add a quick note…"
              className="max-w-xs"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/*                      NEXT ACTION DUE                       */}
        {/* ========================================================= */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-app">Next action due by</p>
          <div className="mt-1 flex w-full justify-center">
            {nextActionDue && deadlineVariant ? (
              <div className="w-full max-w-sm">
                <Alert
                  variant={deadlineVariant}
                  align="center"
                  message={formatDateTime(nextActionDue.toISOString())}
                  messageClassName="text-app leading-none"
                />
              </div>
            ) : (
              <p className="text-sm text-app-muted">No due date set</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-app pt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              variant="primary"
              className="flex-1 justify-center"
              onClick={() => requestTicketTab("notes")}
            >
              Add New Note
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => onShowTicketDetails?.()}
            >
              Show Ticket Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
