import { cookies } from "next/headers";
import { normalizeTicket } from "@/features/tickets/utils/normalizers";

// ===============================
// GET ALL TICKETS (Client only)
// ===============================
export async function getAllTickets() {
  // Client fetch through proxy (cookie handled automatically)
  const res = await fetch("/api/proxy/tickets/all", {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();

  try {
    const json = JSON.parse(text);
    const list = json.tickets || [];

    // 🔥 Normalize list
    return list.map((t: any) => normalizeTicket(t));
  } catch {
    return [];
  }
}

// ===============================
// GET SINGLE TICKET (Server only)
// ===============================
export async function getTicketById(id: string) {
  // ⬇️ Next 15: MUST await cookies()
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    console.error("❌ [getTicketById] No session cookie found");
    return null;
  }

  const base = process.env.SERVER_INTERNAL_URL || "http://127.0.0.1:3000";
  const url = `${base}/api/proxy/ticket/${id}`;

  console.log("🌐 [getTicketById] Fetching:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Cookie: `session=${session}`, // required for proxy auth
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("❌ [getTicketById] Failed:", res.status);
    return null;
  }

  const json = await res.json();

  // 🔥 Backend returns: { success, ticket }
  // Normalize the actual ticket so components get a clean object
  return normalizeTicket(json.ticket ?? json);
}
