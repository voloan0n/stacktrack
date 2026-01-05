import type { NotificationTemplateType, NotificationTemplateVariant } from "./templateRenderer";

export type DefaultNotificationTemplate = {
  type: NotificationTemplateType;
  variant: NotificationTemplateVariant;
  titleTemplate: string;
  bodyTemplate: string;
};

export const DEFAULT_NOTIFICATION_TEMPLATES: DefaultNotificationTemplate[] = [
  {
    type: "ticket.created",
    variant: "short",
    titleTemplate: "New Ticket: {{ticketSubject}}",
    bodyTemplate: "",
  },
  {
    type: "ticket.assigned",
    variant: "short",
    titleTemplate: "You were assigned a ticket",
    bodyTemplate: "",
  },
  {
    type: "ticket.status.updated",
    variant: "short",
    titleTemplate: "Ticket status updated",
    bodyTemplate: "Ticket {{ticketNumber}} changed from {{oldStatus}} to {{newStatus}}.",
  },
  {
    type: "ticket.note.created",
    variant: "short",
    titleTemplate: "{{authorName}} added a note",
    bodyTemplate: "{{notePreview}}",
  },
];
