type NormalizeTicketDetailParams = {
  ticket: any;
  comments: any[];
  timeTracking: any[];
  files: any[];
};

export function normalizeTicketDetail({
  ticket,
  comments,
  timeTracking,
  files,
}: NormalizeTicketDetailParams) {
  const client = ticket.client
    ? {
        id: ticket.client.id,
        name: ticket.client.name ?? "",
        email: ticket.client.email ?? "",
        phone: ticket.client.phone ?? "",
        miscNotes: ticket.client.miscNotes ?? null,
        addressLine1: ticket.client.addressLine1 ?? "",
        addressCity: ticket.client.addressCity ?? "",
        addressState: ticket.client.addressState ?? "",
        addressPostal: ticket.client.addressPostal ?? "",
        country: ticket.client.country ?? "US",
        // Convenience duplicates for frontend
        city: ticket.client.addressCity ?? "",
        state: ticket.client.addressState ?? "",
        address: {
          line1: ticket.client.addressLine1 ?? "",
          line2: "",
          city: ticket.client.addressCity ?? "",
          state: ticket.client.addressState ?? "",
          postal: ticket.client.addressPostal ?? "",
          country: ticket.client.country ?? "US",
        },
      }
    : null;

  return {
    id: ticket.id,
    number: ticket.number, // raw number
    title: ticket.title ?? "",
    detail: ticket.detail ?? "",
    quickNotes: ticket.quickNotes ?? null,
    status: ticket.status ?? "",
    priority: ticket.priority ?? "",
    type: ticket.type ?? "",
    internalOnly: ticket.internalOnly ?? false,

    createdAt: ticket.createdAt ?? null,
    updatedAt: ticket.updatedAt ?? null,

    client,
    createdBy: ticket.createdBy ?? null,
    assignedTo: ticket.assignedTo ?? null,

    assignees: Array.isArray(ticket.assignees)
      ? ticket.assignees.map((assignment: any) => ({
          isPrimary: assignment.isPrimary,
          assignedAt: assignment.assignedAt,
          user: assignment.user
            ? {
                id: assignment.user.id,
                name: assignment.user.name ?? "",
                email: assignment.user.email ?? "",
                avatarColor: assignment.user.accentColor || "primary",
                image: assignment.user.image || "/images/user/user-17.jpg",
              }
            : null,
        }))
      : [],

    comments,
    timeTracking,
    files: Array.isArray(files)
      ? files.map((f: any) => ({
          ...f,
          user: f.uploadedBy
            ? {
                id: f.uploadedBy.id,
                name: f.uploadedBy.name,
              }
            : null,
        }))
      : [],
  };
}

