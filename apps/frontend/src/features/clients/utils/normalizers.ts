// =========================================================
// Normalize a SINGLE client (Detail View)
// =========================================================
export function normalizeClient(c: any) {
  if (!c) return null;

  const address =
    c.address ||
    c.physicalAddress || {
      line1: c.addressLine1 ?? "",
      line2: "",
      city: c.addressCity ?? "",
      state: c.addressState ?? "",
      postal: c.addressPostal ?? "",
      country: c.country ?? "US",
    };

  return {
    id: c.id,
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",

    miscNotes: c.miscNotes ?? "",

    address,
    physicalAddress: address,

    tickets: Array.isArray(c.tickets)
      ? c.tickets.map((t: any) => ({
          id: t.id,
          displayId: t.number
            ? `#${String(t.number).padStart(6, "0")}`
            : "#000000",
          title: t.title ?? "",
          status: t.status ?? "New",
          createdAt: t.createdAt ?? null,
        }))
      : [],

    notes: Array.isArray(c.notes)
      ? c.notes.map((n: any) => ({
          id: n.id,
          title: n.title ?? "",
          createdAt: n.createdAt ?? null,
        }))
      : [],
  };
}

// =========================================================
// Normalize an ARRAY of clients (List View)
// =========================================================
export function normalizeClientList(rawClients: any[]) {
  if (!Array.isArray(rawClients)) return [];

  return rawClients.map((c: any) => ({
    id: c.id,
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",

    createdAt: c.createdAt ?? null,
    addressCity: c.addressCity ?? "",
    addressState: c.addressState ?? "",
    ticketCount: c?._count?.tickets ?? c.ticketCount ?? 0,
  }));
}
