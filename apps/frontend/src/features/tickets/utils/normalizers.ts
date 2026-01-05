// =========================================================
// Normalize a SINGLE ticket (Detail + Table Safe)
// =========================================================
export function normalizeTicket(t: any) {
  if (!t) return null;

  const sanitizeEmail = (value?: string | null) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === "admin@stacktrack.io") return "";
    return trimmed;
  };

  const ticketNumber = typeof t.number === "number" ? t.number : 0;
  const normalizeUser = (user: any) => ({
    id: user?.id ?? "",
    name: user?.name ?? "Unknown User",
    email: sanitizeEmail(user?.email),
    phone: user?.phone ?? "",
    avatarColor: user?.avatarColor || user?.accentColor || "primary",
    image: user?.image ?? "/images/user/user-17.jpg",
  });

  let detailText = "";
  let detailObj: any = null;

  if (typeof t.detail === "string") {
    detailText = t.detail;
    try {
      detailObj = JSON.parse(t.detail);
    } catch {
      detailObj = null;
    }
  } else if (typeof t.detail === "object" && t.detail !== null) {
    detailObj = t.detail;
    detailText = t.detail.text || "";
  }

  const internalOnly = Boolean(
    (t as any).hidden ??
      (t as any).internalOnly ??
      (t as any).internal ??
      detailObj?.internal
  );

  const requesterSource =
    detailObj?.requester ||
    t.requester ||
    t.requestedBy ||
    t.createdBy ||
    t.openedBy ||
    t.user ||
    (internalOnly ? null : t.client);

  const requester = normalizeUser(requesterSource || {});

  // Build assignee list from assignment records. Only fall back to legacy `assignedTo`
  // when assignments are not present, so the mini list reflects assigned users only
  // and avoids duplicates from mismatched identifiers.
  const assigneeMap: Record<string, ReturnType<typeof normalizeUser>> = {};

  if (Array.isArray((t as any).assignees) && (t as any).assignees.length > 0) {
    for (const raw of (t as any).assignees) {
      const user = raw && (raw.user || raw);
      if (!user) continue;

      const normalized = normalizeUser(user);
      const key = normalized.id || normalized.email || normalized.name;
      if (!key) continue;

      const finalUser = {
        ...normalized,
        id: normalized.id || key,
      };

      if (!assigneeMap[key]) {
        assigneeMap[key] = finalUser;
      }
    }
  } else if ((t as any).assignedTo) {
    const normalized = normalizeUser((t as any).assignedTo);
    const key = normalized.id || normalized.email || normalized.name;
    if (key) {
      assigneeMap[key] = {
        ...normalized,
        id: normalized.id || key,
      };
    }
  }

  const assignees = Object.values(assigneeMap);

  const rawClient: any = t.client || {};
  const rawAddress =
    rawClient.address ||
    rawClient.physicalAddress || {
      line1: rawClient.addressLine1,
      line2: "",
      city: rawClient.addressCity,
      state: rawClient.addressState,
      postal: rawClient.addressPostal,
      country: rawClient.country,
    };

  const city = rawAddress?.city || rawClient.city || "";
  const state = rawAddress?.state || rawClient.state || "";

  const addressParts = [
    rawAddress?.line1,
    rawAddress?.line2,
    city,
    state,
    rawAddress?.postal,
  ]
    .map((v) => (v || "").trim())
    .filter(Boolean);

  const clientAddress = addressParts.join(", ");

  const clientPhoneRaw =
    rawClient.phone ?? rawClient.primaryPhone ?? rawClient.phoneNumber ?? "";

  return {
    id: t.id,
    displayId: `#${String(ticketNumber).padStart(6, "0")}`,
    number: ticketNumber,

    title: t.title ?? t.subject ?? "Untitled Ticket",
    detail: detailText || t.detail?.text || "",
    quickNotes: typeof (t as any).quickNotes === "string" ? (t as any).quickNotes : "",
    internalOnly,
    requester,
    createdBy: t.createdBy ? normalizeUser(t.createdBy) : null,

    createdAt: t.createdAt ?? null,
    updatedAt: t.updatedAt ?? null,

    status: formatStatus(t.status),
    priority: capitalize(t.priority ?? "low"),
    type: capitalize(t.type ?? "General"),

    client: internalOnly
      ? null
      : {
          id: rawClient.id ?? null,
          name: rawClient.name ?? "Unknown",
          email: sanitizeEmail(rawClient.email),
          company:
            typeof rawClient.company === "string"
              ? rawClient.company
              : (rawClient.company as any)?.name ?? "",
          notes: rawClient.miscNotes ?? rawClient.notes ?? "",
          type: rawClient.type ?? "",
          phone: clientPhoneRaw,
          city,
          state,
          address: clientAddress,
          addressLine1: rawClient.addressLine1 ?? rawAddress?.line1 ?? "",
          addressPostal: rawClient.addressPostal ?? rawAddress?.postal ?? "",
          country: rawClient.country ?? rawAddress?.country ?? "",
        },

    assignees,

    comments: Array.isArray(t.comments || t.notes)
      ? (t.comments || t.notes).map((comment: any, idx: number) => ({
          id: comment.id ?? `comment-${idx}`,
          body: comment.body ?? comment.text ?? "",
          text: comment.text ?? comment.body ?? "",
          createdAt: comment.createdAt ?? null,
          internalOnly: Boolean(
            (comment as any).hidden ??
              (comment as any).internalOnly ??
              (comment as any).internal ??
              (comment as any).isInternal
          ),
          user: normalizeUser(comment.user),
        }))
      : [],
    files: Array.isArray(t.files) ? t.files : [],
    timeTracking: Array.isArray(t.timeTracking) ? t.timeTracking : [],
  };
}

// =========================================================
// Normalize ARRAY of tickets
// =========================================================
export function normalizeTicketList(rawTickets: any[]) {
  if (!Array.isArray(rawTickets)) return [];
  return rawTickets.map((t) => normalizeTicket(t));
}

// =========================================================
// Helpers
// =========================================================
function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function formatStatus(status: string) {
  if (!status) return "Unknown";
  switch (status.toLowerCase()) {
    case "new": return "New";
    case "in_progress":
    case "in progress": return "In Progress";
    case "closed": return "Closed";
    default: return capitalize(status);
  }
}
