import { prisma } from "../config/prisma";
import { checkSession } from "../lib/session";
import type { Reply, Request } from "../lib/http";
import {
  notifyTicketAssigned,
  notifyTicketCreated,
  notifyTicketInternalNote,
  notifyTicketStatusUpdated,
} from "../lib/notifications/notificationService";
import { normalizeTicketDetail } from "../lib/tickets/normalizeTicketDetail";

function isStackTrackActivityDivider(text: unknown) {
  return typeof text === "string" && /^\[\[stacktrack:(status|assignee|transfer)\]\]/.test(text);
}

export const TicketController = {
  // ============================================================
  // CREATE TICKET (authenticated)
  // ============================================================
  async create(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ message: "Unauthorized" });

    const {
      name,
      company,
      clientId,
      title,
      detail,
      priority,
      email,
      engineer,
      type,
      internalOnly,
      status,
      assignmentMode = "add",
    } = request.body;

    let isInternal = Boolean(internalOnly);
    const clientRelation = (() => {
      if (isInternal) return undefined;

      const connectId = company || clientId;
      if (connectId) return { connect: { id: connectId } };

      const normalizedEmail = typeof email === "string" ? email.trim() : "";
      if (normalizedEmail) {
        return {
          connectOrCreate: {
            where: { email: normalizedEmail },
            create: {
              name: name || "New Client",
              email: normalizedEmail,
            },
          },
        };
      }

      if (typeof name === "string" && name.trim()) {
        return {
          create: {
            name: name.trim(),
          },
        };
      }

      return undefined;
    })();

    // Invariant: tickets are either internal OR linked to a client.
    // If a caller creates a non-internal ticket without any client info, force internal.
    if (!isInternal && !clientRelation) {
      isInternal = true;
    }

    const assignmentModeNormalized =
      typeof assignmentMode === "string" && assignmentMode.toLowerCase() === "transfer"
        ? "transfer"
        : "add";
    const engineerId = engineer || null;

    const assigneesCreate: any[] = [];
    const primaryAssigneeId = engineerId || user.id;

    // Always add the primary assignee
    assigneesCreate.push({
      userId: primaryAssigneeId,
      assignedById: user.id,
      isPrimary: true,
    });

    // In "add" mode, also add the creator if different
    if (assignmentModeNormalized === "add" && user.id !== primaryAssigneeId) {
      assigneesCreate.push({
        userId: user.id,
        assignedById: user.id,
        isPrimary: false,
      });
    }

    const data = await prisma.ticket.create({
      data: {
        title,
        detail: typeof detail === "object" ? detail : detail ? { text: detail } : {},
        priority: (priority || "low").toLowerCase(),
        email: isInternal ? null : email,
        type: (type || "support").toLowerCase(),
        status: (status || "new").toLowerCase(),
        internalOnly: isInternal,
        ...(!isInternal && clientRelation ? { client: clientRelation } : {}),
        assignedTo: { connect: { id: primaryAssigneeId } },
        createdBy: { connect: { id: user.id } },
        assignees: {
          create: assigneesCreate,
        },
      },
    });

    await notifyTicketCreated({
      ticketId: data.id,
      ticketNumber: (data as any).number ?? null,
      title: data.title ?? null,
      createdByUserId: user.id,
    });

    if (primaryAssigneeId && primaryAssigneeId !== user.id) {
      await notifyTicketAssigned({
        ticketId: data.id,
        ticketNumber: (data as any).number ?? null,
        assigneeUserId: primaryAssigneeId,
        actorUserId: user.id,
      });
    }

    return reply.send({
      success: true,
      id: data.id,
    });
  },

  // ============================================================
  // CREATE TICKET (public, no authentication)
  // ============================================================
  async createPublic(request: Request, reply: Reply) {
    const {
      name,
      company,
      clientId,
      title,
      detail,
      priority,
      email,
      engineer,
      type,
      status,
      internalOnly,
    } = request.body;

    const clientRelation = (() => {
      const isInternal = Boolean(internalOnly);
      if (isInternal) return undefined;

      const connectId = company || clientId;
      if (connectId) return { connect: { id: connectId } };
      if (email) {
        return {
          connectOrCreate: {
            where: { email },
            create: {
              name: name || "New Client",
              email,
              active: true,
            },
          },
        };
      }
      return {
        create: {
          name: name || "New Client",
          active: true,
        },
      };
    })();

    const isInternal = Boolean(internalOnly);
    const data = await prisma.ticket.create({
      data: {
        title,
        detail: typeof detail === "object" ? detail : detail ? { text: detail } : {},
        priority: (priority || "low").toLowerCase(),
        email: isInternal ? null : email,
        type: (type || "support").toLowerCase(),
        status: (status || "new").toLowerCase(),
        internalOnly: isInternal,
        ...(clientRelation ? { client: clientRelation } : {}),
        assignedTo: engineer ? { connect: { id: engineer } } : undefined,
        assignees: engineer
          ? {
              create: {
                userId: engineer,
                assignedById: null,
                isPrimary: true,
              },
            }
          : undefined,
      },
    });

    return reply.send({
      success: true,
      id: data.id,
    });
  },

  // ============================================================
  // LIST TICKETS (paginated)
  // ============================================================
  async listPaginated(request: Request, reply: Reply) {
    try {
      const {
        page = 1,
        limit = 25,
        search = "",
        status,
        type,
        sort = "createdAt",
        order = "desc",
      } = request.query;

      const pageNum = Math.max(parseInt(page), 1);
      const takeNum = Math.min(Math.max(parseInt(limit), 1), 100);
      const skipNum = (pageNum - 1) * takeNum;

      const where: any = {};

      if (status) where.status = status;
      if (type) where.type = type;

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { id: { contains: search } },
          { number: !isNaN(Number(search)) ? Number(search) : undefined },
          { client: { name: { contains: search, mode: "insensitive" } } },
          { assignedTo: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          skip: skipNum,
          take: takeNum,
          orderBy: { [sort]: order },
          select: {
            id: true,
            number: true,
            title: true,
            createdAt: true,
            status: true,
            priority: true,
            type: true,
            internalOnly: true,
            quickNotes: true,
            detail: true,
            client: { select: { id: true, name: true, email: true, addressCity: true, addressState: true } },
            assignedTo: { select: { name: true, email: true, accentColor: true, image: true } },
            createdBy: { select: { id: true, name: true, email: true, phone: true } },
            assignees: {
              select: {
                userId: true,
                isPrimary: true,
                user: { select: { id: true, name: true, email: true, accentColor: true, image: true } },
              },
            },
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      return reply.send({
        success: true,
        page: pageNum,
        limit: takeNum,
        total,
        tickets,
      });
    } catch (err) {
      console.error("TicketController.listPaginated failed:", err);
      return reply.code(500).send({
        success: false,
        message: "Failed to load ticket list.",
      });
    }
  },

  // ============================================================
  // GET TICKET BY ID
  // ============================================================
  async getById(request: Request, reply: Reply) {
    try {
      const { id } = request.params;

      // Main ticket lookup
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: {
          id: true,
          number: true,
          title: true,
          detail: true,
          quickNotes: true,
          status: true,
          priority: true,
          type: true,
          internalOnly: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              miscNotes: true,
              addressLine1: true,
              addressCity: true,
              addressState: true,
              addressPostal: true,
              country: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              accentColor: true,
              image: true,
            },
          },
          assignees: {
            select: {
              isPrimary: true,
              assignedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  accentColor: true,
                  image: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!ticket) {
        return reply.code(404).send({ success: false, message: "Not found" });
      }

      // TIME TRACKING
      const timeTracking = await prisma.timeTracking.findMany({
        where: { ticketId: id },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      // COMMENTS
      const comments = await prisma.comment.findMany({
        where: { ticketId: id },
        include: {
          user: { select: { id: true, name: true, accentColor: true, email: true, image: true } },
        },
      });

      // FILES
      const ticketFileModel = (prisma as any).ticketFile;
      const files = ticketFileModel?.findMany
        ? await ticketFileModel.findMany({
            where: { ticketId: id },
            include: {
              uploadedBy: { select: { id: true, name: true } },
            },
          })
        : [];

      // NORMALIZE TICKET OBJECT
      const normalized = normalizeTicketDetail({
        ticket,
        comments,
        timeTracking,
        files,
      });

      return reply.send({
        success: true,
        ticket: normalized,
      });
    } catch (err) {
      console.error("TicketController.getById failed:", err);
      return reply.code(500).send({
        success: false,
        message: "Failed to load ticket details.",
      });
    }
  },

  // ============================================================
  // UPDATE TICKET (title, detail, priority, type, client)
  // ============================================================
  async update(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    const { id } = request.params;
    const {
      title,
      detail,
      quickNotes,
      priority,
      type,
      clientId,
      email,
      internalOnly,
    } = request.body || {};

    const existing = await prisma.ticket.findUnique({
      where: { id },
      select: { assignedToId: true, clientId: true, internalOnly: true, status: true, number: true },
    });
    if (!existing) {
      return reply.code(404).send({ success: false, message: "Ticket not found" });
    }
    // Any authenticated user can update basic ticket fields; no admin/assignee restriction

    const updatePayload: any = {};
    const nextInternalOnly =
      typeof internalOnly === "boolean" ? internalOnly : undefined;
    const effectiveInternalOnly =
      typeof nextInternalOnly === "boolean"
        ? nextInternalOnly
        : Boolean(existing.internalOnly);

    if (typeof title === "string") updatePayload.title = title;
    if (typeof email !== "undefined") updatePayload.email = email || null;
    if (typeof quickNotes !== "undefined") updatePayload.quickNotes = quickNotes || null;
    if (typeof detail !== "undefined") {
      updatePayload.detail =
        typeof detail === "string" ? { text: detail } : detail || {};
    }
    if (priority) updatePayload.priority = String(priority).toLowerCase();
    if (type) updatePayload.type = String(type).toLowerCase();
    if (typeof nextInternalOnly === "boolean") {
      updatePayload.internalOnly = nextInternalOnly;
    }

    // Invariant: tickets are either internal OR linked to a client.
    if (effectiveInternalOnly === true) {
      updatePayload.client = { disconnect: true };
      updatePayload.email = null;
    } else {
      if (clientId) {
        updatePayload.client = { connect: { id: clientId } };
      } else if (!existing.clientId) {
        return reply
          .code(400)
          .send({ success: false, message: "Client is required when internalOnly is false." });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updatePayload,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            miscNotes: true,
            addressLine1: true,
            addressCity: true,
            addressState: true,
            addressPostal: true,
            country: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            accentColor: true,
            image: true,
          },
        },
      },
    });

    if (typeof updatePayload.status === "string") {
      const normalizedStatus = String(updatePayload.status || "").toLowerCase();
      if (normalizedStatus && normalizedStatus !== String(existing.status || "").toLowerCase()) {
        await notifyTicketStatusUpdated({
          ticketId: id,
          ticketNumber: (existing as any)?.number ?? null,
          oldStatus: String(existing.status || ""),
          newStatus: normalizedStatus,
          actorUserId: user.id,
        });
      }
    }

    return reply.send({ success: true, ticket: updated });
  },

  // ============================================================
  // UPDATE TICKET STATUS
  // ============================================================
  async updateStatus(request: Request, reply: Reply) {
    const { id, status } = request.body;
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { assignedToId: true, status: true, number: true },
    });

    if (!ticket) return reply.code(404).send({ success: false, message: "Not found" });
    // Any authenticated user can update status; no admin/assignee restriction

    const normalizedStatus = typeof status === "string" ? status.toLowerCase() : null;
    if (!normalizedStatus) {
      return reply.code(400).send({ success: false, message: "Status is required" });
    }

    const data = await prisma.ticket.update({
      where: { id },
      data: {
        status: normalizedStatus,
        isComplete: ["resolved", "closed"].includes(normalizedStatus),
      },
    });

    await notifyTicketStatusUpdated({
      ticketId: id,
      ticketNumber: (data as any).number ?? null,
      oldStatus: String((ticket as any)?.status || ""),
      newStatus: normalizedStatus,
      actorUserId: user.id,
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // ADD COMMENT
  // ============================================================
  async comment(request: Request, reply: Reply) {
    const { id, text, public: isPublic } = request.body;
    const user = await checkSession(request);

    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        assignedToId: true,
        internalOnly: true,
        assignees: { select: { userId: true } },
      },
    });

    if (!ticket) return reply.code(404).send({ success: false, message: "Not found" });

    await prisma.comment.create({
      data: {
        text,
        ticketId: id,
        public: ticket.internalOnly ? false : isPublic,
        internal: !isPublic || ticket.internalOnly ? true : false,
        userId: user.id,
      },
    });

    const data = await prisma.ticket.findUnique({ where: { id } });

    if (!isStackTrackActivityDivider(text)) {
      await notifyTicketInternalNote({
        ticketId: id,
        ticketNumber: (data as any)?.number ?? null,
        notePreview: typeof text === "string" ? text.slice(0, 80) : null,
        actorUserId: user.id,
      });
    }

    return reply.send({ success: true });
  },

  // ============================================================
  // ADD NOTE (comment + worklog)
  // ============================================================
  async addNote(request: Request, reply: Reply) {
    const {
      id,
      text,
      status,
      durationMin = 0,
      billable = false,
      supportType,
      internal = true,
    } = request.body;

    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    if (!id || !text) {
      return reply.code(400).send({ success: false, message: "Ticket id and text are required" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, number: true, status: true, internalOnly: true, clientId: true, assignees: { select: { userId: true } } },
    });
    if (!ticket) {
      return reply.code(404).send({ success: false, message: "Ticket not found" });
    }
    // Any authenticated user can add internal notes; do not require assignment/admin here

    const statusForDb = typeof status === "string" && status.trim()
      ? status.toLowerCase().replace(/\s+/g, "_")
      : null;

    const comment = await prisma.comment.create({
      data: {
        text,
        ticketId: id,
        public: false,
        internal: ticket.internalOnly ? true : Boolean(internal),
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, accentColor: true, image: true } },
      },
    });

    let timeEntry: any = null;
    if (durationMin && durationMin > 0) {
      timeEntry = await prisma.timeTracking.create({
        data: {
          title: supportType || "Worklog",
          comment: text,
          durationMin,
          billable: Boolean(billable),
          ticketId: id,
          userId: user.id,
          companyId: ticket.clientId,
        },
        include: {
          user: { select: { id: true, name: true, email: true, accentColor: true, image: true } },
        },
      });
    }

    let updatedTicket: any = ticket;
    if (statusForDb) {
      updatedTicket = await prisma.ticket.update({
        where: { id },
        data: {
          status: statusForDb,
          isComplete: ["resolved", "closed"].includes(statusForDb),
        },
      });
    }

    if (!isStackTrackActivityDivider(text)) {
      await notifyTicketInternalNote({
        ticketId: id,
        ticketNumber: (ticket as any)?.number ?? null,
        notePreview: typeof text === "string" ? text.slice(0, 80) : null,
        actorUserId: user.id,
      });
    }

    if (statusForDb && statusForDb !== String((ticket as any)?.status || "").toLowerCase()) {
      await notifyTicketStatusUpdated({
        ticketId: id,
        ticketNumber: (ticket as any)?.number ?? null,
        oldStatus: String((ticket as any)?.status || ""),
        newStatus: statusForDb,
        actorUserId: user.id,
      });
    }

    return reply.send({
      success: true,
      comment,
      timeTracking: timeEntry,
      ticket: updatedTicket,
      meta: {
        supportType: supportType || null,
        billable,
        durationMin,
        status: statusForDb,
      },
    });
  },

  // ============================================================
  // DELETE COMMENT
  // ============================================================
  async deleteComment(request: Request, reply: Reply) {
    const { id, timeTrackingId } = request.body;

    if (id) {
      await prisma.comment.delete({
        where: { id },
      });
    }

    if (timeTrackingId) {
      await prisma.timeTracking.delete({
        where: { id: timeTrackingId },
      });
    }

    return reply.send({ success: true });
  },

  // ============================================================
  // TRANSFER TICKET
  // ============================================================
  async transferUser(request: Request, reply: Reply) {
    const { id, user: userId, mode = "transfer" } = request.body;
    const assigner = await checkSession(request);

    if (!assigner) {
      return reply.code(401).send({ success: false, message: "Unauthorized" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { assignedToId: true, assignees: { select: { userId: true } } },
    });

    if (!ticket) {
      return reply.code(404).send({ success: false, message: "Ticket not found" });
    }

    if (mode === "transfer" && !userId) {
      return reply.code(400).send({ success: false, message: "Target user required" });
    }

    const targetUser = userId
      ? await prisma.user.findFirst({
          where: {
            OR: [{ id: userId }, { email: userId }],
          },
        })
      : null;

    if (userId && !targetUser) {
      return reply.code(404).send({ success: false, message: "User not found" });
    }

    // manage assignments
    if (targetUser) {
      await prisma.ticketAssignment.upsert({
        where: { ticketId_userId: { ticketId: id, userId: targetUser.id } },
        create: {
          ticketId: id,
          userId: targetUser.id,
          assignedById: assigner.id,
          isPrimary: mode !== "add",
        },
        update: {
          assignedById: assigner.id,
          assignedAt: new Date(),
          isPrimary: mode !== "add",
        },
      });

      if (mode === "transfer") {
        await prisma.ticketAssignment.deleteMany({
          where: {
            ticketId: id,
            NOT: { userId: targetUser.id },
          },
        });
      }
    } else {
      await prisma.ticketAssignment.deleteMany({ where: { ticketId: id } });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: targetUser
        ? { assignedTo: { connect: { id: targetUser.id } } }
        : { assignedTo: { disconnect: true } },
      include: {
        assignedTo: true,
      },
    });

    const assigneeName = updated.assignedTo?.name || "Unassigned";
    const actorName = assigner.name || "System";
    const activity = userId
      ? `${mode === "transfer" ? "Transferred" : "Assigned"} to ${assigneeName} by ${actorName}`
      : `Unassigned by ${actorName}`;

    await prisma.comment.create({
      data: {
        text: activity,
        ticketId: id,
        userId: assigner.id,
        internal: true,
      },
    });

    if (updated.assignedTo) {
      await notifyTicketAssigned({
        ticketId: id,
        ticketNumber: (updated as any).number ?? null,
        assigneeUserId: updated.assignedTo.id,
        actorUserId: assigner.id,
      });
    }

    return reply.send({ success: true });
  },

  // ============================================================
  // DELETE TICKET
  // ============================================================
  async delete(request: Request, reply: Reply) {
    const { id } = request.body;

    await prisma.ticket.delete({
      where: { id },
    });

    return reply.send({ success: true });
  },
};
