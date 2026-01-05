import {
  addTicketNote,
  assignTicketApi,
  createTicketApi,
  deleteTicketApi,
  updateTicketApi,
  updateTicketStatusApi,
} from "@/features/tickets/services/api";

export async function createTicket(data: any) {
  return await createTicketApi(data);
}

export async function deleteTicket(id: string) {
  return await deleteTicketApi(id);
}

export async function updateTicket(id: string, data: any) {
  const json = await updateTicketApi(id, data);
  return json.ticket ?? json;
}

export async function assignTicket(id: string, userId: string, mode: "add" | "transfer" = "add") {
  return await assignTicketApi(id, userId, mode);
}

export async function updateTicketStatus(id: string, status: string) {
  return await updateTicketStatusApi(id, status);
}

export async function addNote(payload: {
  id: string;
  text: string;
  durationMin?: number;
  billable?: boolean;
  billingType?: string | null;
  supportType?: string | null;
  status?: string | null;
  internal?: boolean;
}) {
  return await addTicketNote(payload);
}
