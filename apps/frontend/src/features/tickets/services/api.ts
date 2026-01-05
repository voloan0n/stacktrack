const JSON_HEADERS = { "Content-Type": "application/json" };

async function handleUnauthorized() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;

  try {
    // Clears the httpOnly `session` cookie via the Next proxy handler.
    await fetch("/api/proxy/auth/logout", { method: "GET", credentials: "include" });
  } catch {
    // ignore
  }

  window.location.href = "/login";
}

async function request(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // leave json null if parse fails
  }

  if (!res.ok) {
    if (res.status === 401) {
      await handleUnauthorized();
    } else {
      console.error("[tickets api] failed", { path, status: res.status, text });
    }

    const message = (json && (json.message || json.error)) || text || "Request failed";
    throw new Error(message);
  }

  return json;
}

export async function fetchTicketList(page = 1, limit = 20) {
  const data = await request(`/api/proxy/tickets?page=${page}&limit=${limit}`);
  return {
    tickets: data?.tickets ?? [],
    total: data?.total ?? (data?.tickets ? data.tickets.length : 0),
  };
}

export async function fetchTicketDetail(id: string) {
  return await request(`/api/proxy/tickets/${id}`);
}

export async function createTicketApi(payload: any) {
  return await request("/api/proxy/tickets", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function updateTicketApi(id: string, payload: any) {
  return await request(`/api/proxy/tickets/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function deleteTicketApi(id: string) {
  return await request("/api/proxy/tickets/delete", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ id }),
  });
}

export async function assignTicketApi(id: string, userId: string, mode: "add" | "transfer") {
  return await request("/api/proxy/tickets/transfer", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, user: userId, mode }),
  });
}

export async function updateTicketStatusApi(id: string, status: string) {
  return await request("/api/proxy/tickets/status", {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, status }),
  });
}

export async function addTicketNote(payload: {
  id: string;
  text: string;
  durationMin?: number;
  billable?: boolean;
  billingType?: string | null;
  supportType?: string | null;
  status?: string | null;
  internal?: boolean;
}) {
  return await request("/api/proxy/tickets/note", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}
