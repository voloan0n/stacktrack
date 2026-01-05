import { prisma } from "../config/prisma";
import { checkSession } from "../lib/session";
import type { Reply, Request } from "../lib/http";

const normalizeKey = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

async function ensureDefaultTicketOptions() {
  const [
    statusCount,
    typeCount,
    priorityCount,
    supportTypeCount,
    billingTypeCount,
  ] = await Promise.all([
    prisma.ticketStatusOption.count(),
    prisma.ticketTypeOption.count(),
    prisma.ticketPriorityOption.count(),
    prisma.ticketSupportTypeOption.count(),
    prisma.ticketBillingTypeOption.count(),
  ]);

  if (statusCount === 0) {
    const defaults = [
      { key: "new", label: "New", order: 1, isDefault: true, nextActionDueHours: 4 },
      { key: "in_progress", label: "In Progress", order: 2, isDefault: false, nextActionDueHours: 72 },
      { key: "waiting_on_client", label: "Waiting on Client", order: 3, isDefault: false, nextActionDueHours: 48 },
      { key: "on_hold", label: "On Hold", order: 4, isDefault: false, nextActionDueHours: 96 },
      { key: "resolved", label: "Resolved", order: 5, isDefault: false, nextActionDueHours: 24 },
      { key: "closed", label: "Closed", order: 6, isDefault: false, nextActionDueHours: null },
      { key: "cancelled", label: "Cancelled", order: 7, isDefault: false, nextActionDueHours: 24 },
    ];

    await prisma.ticketStatusOption.createMany({
      data: defaults.map((s) => ({
        key: s.key,
        label: s.label,
        description: null,
        nextActionDueHours: s.nextActionDueHours as any,
        order: s.order,
        active: true,
        isDefault: s.isDefault,
        colorKey: null,
      })),
    });
  }

  if (priorityCount === 0) {
    await prisma.ticketPriorityOption.createMany({
      data: [
        { key: "low", label: "Low", order: 1, active: true, isDefault: false, colorKey: null },
        { key: "medium", label: "Medium", order: 2, active: true, isDefault: true, colorKey: null },
        { key: "high", label: "High", order: 3, active: true, isDefault: false, colorKey: null },
        { key: "urgent", label: "Urgent", order: 4, active: true, isDefault: false, colorKey: null },
      ],
    });
  }

  if (typeCount === 0) {
    await prisma.ticketTypeOption.createMany({
      data: [
        { key: "service_call", label: "Service Call", description: null, order: 1, active: true, isDefault: false, colorKey: null },
        { key: "support", label: "Support", description: null, order: 2, active: true, isDefault: true, colorKey: null },
        { key: "bug", label: "Bug", description: null, order: 3, active: true, isDefault: false, colorKey: null },
        { key: "incident", label: "Incident", description: null, order: 4, active: true, isDefault: false, colorKey: null },
        { key: "maintenance", label: "Maintenance", description: null, order: 5, active: true, isDefault: false, colorKey: null },
      ],
    });
  }

  if (supportTypeCount === 0) {
    await prisma.ticketSupportTypeOption.createMany({
      data: [
        { key: "remote", label: "Remote", order: 1, active: true, isDefault: true },
        { key: "on_site", label: "Onsite", order: 2, active: true, isDefault: false },
        { key: "consultation", label: "Consultation", order: 3, active: true, isDefault: false },
        { key: "phone_call", label: "Phone Call", order: 4, active: true, isDefault: false },
      ],
    });
  }

  if (billingTypeCount === 0) {
    await prisma.ticketBillingTypeOption.createMany({
      data: [
        { key: "billable", label: "Billable", order: 1, active: true, isDefault: true },
        { key: "non_billable", label: "Non Billable", order: 2, active: true, isDefault: false },
        { key: "need_review", label: "Need Review", order: 3, active: true, isDefault: false },
      ],
    });
  }
}

export const TicketOptionController = {
  async list(request: Request, reply: Reply) {
    const session = await checkSession(request);
    if (!session) return reply.code(401).send({ success: false, message: "Unauthorized" });

    await ensureDefaultTicketOptions();

    const [statuses, types, priorities, supportTypes, billingTypes] = await Promise.all([
      prisma.ticketStatusOption.findMany({ orderBy: { order: "asc" } }),
      prisma.ticketTypeOption.findMany({ orderBy: { order: "asc" } }),
      prisma.ticketPriorityOption.findMany({ orderBy: { order: "asc" } }),
      prisma.ticketSupportTypeOption.findMany({ orderBy: { order: "asc" } }),
      prisma.ticketBillingTypeOption.findMany({ orderBy: { order: "asc" } }),
    ]);

    return reply.send({ success: true, statuses, types, priorities, supportTypes, billingTypes });
  },

  async upsertStatus(request: Request, reply: Reply) {
    const {
      id,
      key,
      label,
      description,
      nextActionDueHours = null,
      order = 0,
      active = true,
      isDefault = false,
      colorKey = null,
    } = request.body || {};

    if (!key || !label) {
      return reply
        .code(400)
        .send({ success: false, message: "Key and label are required" });
    }

    const normalizedKey = normalizeKey(key);
    const normalizedNextActionDueHours =
      typeof nextActionDueHours === "number"
        ? nextActionDueHours
        : nextActionDueHours === null
          ? null
          : null;

    const data = {
      key: normalizedKey,
      label,
      description: description || null,
      nextActionDueHours: normalizedNextActionDueHours,
      order,
      active,
      isDefault,
      colorKey,
    };
    const record = id
      ? await prisma.ticketStatusOption.update({ where: { id }, data })
      : await prisma.ticketStatusOption.upsert({
          where: { key: normalizedKey },
          create: data,
          update: data,
        });

    return reply.send({ success: true, status: record });
  },

  async upsertType(request: Request, reply: Reply) {
    const {
      id,
      key,
      label,
      description,
      order = 0,
      active = true,
      isDefault = false,
      colorKey = null,
    } = request.body || {};

    if (!key || !label) {
      return reply
        .code(400)
        .send({ success: false, message: "Key and label are required" });
    }

    const normalizedKey = normalizeKey(key);
    const data = {
      key: normalizedKey,
      label,
      description: description || null,
      order,
      active,
      isDefault,
      colorKey,
    };
    const record = id
      ? await prisma.ticketTypeOption.update({ where: { id }, data })
      : await prisma.ticketTypeOption.upsert({
          where: { key: normalizedKey },
          create: data,
          update: data,
        });

    return reply.send({ success: true, type: record });
  },

  async deleteStatus(request: Request, reply: Reply) {
    const { id } = request.params;
    await prisma.ticketStatusOption.delete({ where: { id } });
    return reply.send({ success: true });
  },

  async deleteType(request: Request, reply: Reply) {
    const { id } = request.params;
    await prisma.ticketTypeOption.delete({ where: { id } });
    return reply.send({ success: true });
  },

  async upsertPriority(request: Request, reply: Reply) {
    const {
      id,
      key,
      label,
      order = 0,
      active = true,
      isDefault = false,
      colorKey = null,
    } = request.body || {};

    if (!key || !label) {
      return reply
        .code(400)
        .send({ success: false, message: "Key and label are required" });
    }

    const normalizedKey = normalizeKey(key);

    const data = {
      key: normalizedKey,
      label,
      order,
      active,
      isDefault,
      colorKey,
    };

    const record = id
      ? await prisma.ticketPriorityOption.update({ where: { id }, data })
      : await prisma.ticketPriorityOption.upsert({
          where: { key: normalizedKey },
          create: data,
          update: data,
        });

    return reply.send({ success: true, priority: record });
  },

  async deletePriority(request: Request, reply: Reply) {
    const { id } = request.params;
    if (!id) {
      return reply
        .code(400)
        .send({ success: false, message: "Priority id is required" });
    }

    await prisma.ticketPriorityOption.delete({ where: { id } });
    return reply.send({ success: true });
  },

  async upsertSupportType(request: Request, reply: Reply) {
    const { id, key, label, order = 0, active = true, isDefault = false } = request.body || {};

    if (!key || !label) {
      return reply.code(400).send({ success: false, message: "Key and label are required" });
    }

    const normalizedKey = normalizeKey(key);
    const data = { key: normalizedKey, label, order, active, isDefault };

    const record = id
      ? await prisma.ticketSupportTypeOption.update({ where: { id }, data })
      : await prisma.ticketSupportTypeOption.upsert({
          where: { key: normalizedKey },
          create: data,
          update: data,
        });

    return reply.send({ success: true, supportType: record });
  },

  async deleteSupportType(request: Request, reply: Reply) {
    const { id } = request.params;
    await prisma.ticketSupportTypeOption.delete({ where: { id } });
    return reply.send({ success: true });
  },

  async upsertBillingType(request: Request, reply: Reply) {
    const { id, key, label, order = 0, active = true, isDefault = false } = request.body || {};

    if (!key || !label) {
      return reply.code(400).send({ success: false, message: "Key and label are required" });
    }

    const normalizedKey = normalizeKey(key);
    const data = { key: normalizedKey, label, order, active, isDefault };

    const record = id
      ? await prisma.ticketBillingTypeOption.update({ where: { id }, data })
      : await prisma.ticketBillingTypeOption.upsert({
          where: { key: normalizedKey },
          create: data,
          update: data,
        });

    return reply.send({ success: true, billingType: record });
  },

  async deleteBillingType(request: Request, reply: Reply) {
    const { id } = request.params;
    await prisma.ticketBillingTypeOption.delete({ where: { id } });
    return reply.send({ success: true });
  },
};
