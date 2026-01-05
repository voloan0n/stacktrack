import {
  PrismaClient,
  TicketPriority,
} from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "../lib/notifications/defaultTemplates";

dotenv.config({ path: "./.env" });

const prisma = new PrismaClient();

function hr() {
  process.stdout.write("------------------------------------------------------------\n");
}

function step(message: string) {
  process.stdout.write(`==> ${message}\n`);
}

function info(message: string) {
  process.stdout.write(`    - ${message}\n`);
}

function assertSeed(condition: any, message: string) {
  if (condition) return;
  throw new Error(`Seed validation failed: ${message}`);
}

async function main() {
  hr();
  step("StackTrack database seed");
  hr();

  // =========================================================
  // PERMISSIONS & ROLES
  // =========================================================
  step("Permissions");
  const permissionNames = [
    "*",
    "ticket.view",
    "ticket.create",
    "ticket.update",
    "ticket.assign",
    "ticket.comment",
    "ticket.internal.view",
    "client.view",
    "client.manage",
    "user.manage",
    "settings.manage",
  ];

  const permissionRecords = await Promise.all(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const permByName = Object.fromEntries(
    permissionRecords.map((p) => [p.name, p])
  );

  const connectPerms = (names: string[]) =>
    names.map((n) => ({ id: permByName[n].id }));

  info(`Upserted ${permissionRecords.length} permissions`);

  step("Roles");
  const systemAdminRole = await prisma.role.upsert({
    where: { name: "System Administrator" },
    update: {
      permissions: {
        set: connectPerms(["*"]),
      },
    },
    create: {
      name: "System Administrator",
      description: "Protected full access role (cannot be removed)",
      permissions: {
        connect: connectPerms(["*"]),
      },
    },
  });

  info(`Upserted role: ${systemAdminRole.name}`);

  // =========================================================
  // USERS (SYSTEM ADMIN ONLY)
  // =========================================================
  step("Admin user");
  const adminEmail = "admin@stacktrack.io";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const adminPassword =
    process.env.STACKTRACK_ADMIN_PASSWORD?.trim() ||
    crypto.randomBytes(12).toString("base64").slice(0, 10);

  const adminUser = existingAdmin
    ? await prisma.user.update({
        where: { email: adminEmail },
        data: {
          roleId: systemAdminRole.id,
          ...(process.env.STACKTRACK_FORCE_ADMIN_PASSWORD === "1"
            ? { password: await bcrypt.hash(adminPassword, 10), firstLogin: true }
            : {}),
        },
      })
    : await prisma.user.create({
        data: {
          name: "StackTrack Admin",
          email: adminEmail,
          password: await bcrypt.hash(adminPassword, 10),
          firstLogin: true,
          role: { connect: { id: systemAdminRole.id } },
          accentColor: "primary",
        },
      });

  info(`Email: ${adminUser.email}`);
  if (!existingAdmin || process.env.STACKTRACK_FORCE_ADMIN_PASSWORD === "1") {
    info(`Password: ${adminPassword}`);
  } else {
    info("Password: (unchanged)");
  }

  // =========================================================
  // DEFAULT TICKET OPTIONS
  // =========================================================
  step("Ticket options");
  const statusDefaults = [
    { key: "new", label: "New", order: 1, isDefault: true, nextActionDueHours: 4 },
    { key: "in_progress", label: "In Progress", order: 2, isDefault: false, nextActionDueHours: 72 },
    { key: "waiting_on_client", label: "Waiting on Client", order: 3, isDefault: false, nextActionDueHours: 48 },
    { key: "on_hold", label: "On Hold", order: 4, isDefault: false, nextActionDueHours: 96 },
    { key: "resolved", label: "Resolved", order: 5, isDefault: false, nextActionDueHours: 24 },
    { key: "closed", label: "Closed", order: 6, isDefault: false, nextActionDueHours: null },
    { key: "cancelled", label: "Cancelled", order: 7, isDefault: false, nextActionDueHours: 24 },
  ] as const;

  await Promise.all(
    statusDefaults.map((s) =>
      prisma.ticketStatusOption.upsert({
        where: { key: s.key },
        update: {
          label: s.label,
          description: null,
          nextActionDueHours: s.nextActionDueHours,
          order: s.order,
          active: true,
          isDefault: s.isDefault,
          colorKey: null,
        },
        create: {
          key: s.key,
          label: s.label,
          description: null,
          nextActionDueHours: s.nextActionDueHours,
          order: s.order,
          active: true,
          isDefault: s.isDefault,
          colorKey: null,
        },
      })
    )
  );

  await prisma.ticketStatusOption.updateMany({ data: { isDefault: false } });
  await prisma.ticketStatusOption.update({ where: { key: "new" }, data: { isDefault: true } });
  info(`Status options: ${statusDefaults.length} (default: new)`);

  const typeDefaults = [
    { key: "service_call", label: "Service Call", order: 1, isDefault: false },
    { key: "support", label: "Support", order: 2, isDefault: true },
    { key: "bug", label: "Bug", order: 3, isDefault: false },
    { key: "incident", label: "Incident", order: 4, isDefault: false },
    { key: "maintenance", label: "Maintenance", order: 5, isDefault: false },
  ] as const;

  await Promise.all(
    typeDefaults.map((t) =>
      prisma.ticketTypeOption.upsert({
        where: { key: t.key },
        update: {
          label: t.label,
          description: null,
          order: t.order,
          active: true,
          isDefault: t.isDefault,
          colorKey: null,
        },
        create: {
          key: t.key,
          label: t.label,
          description: null,
          order: t.order,
          active: true,
          isDefault: t.isDefault,
          colorKey: null,
        },
      })
    )
  );

  await prisma.ticketTypeOption.updateMany({ data: { isDefault: false } });
  await prisma.ticketTypeOption.update({ where: { key: "support" }, data: { isDefault: true } });
  info(`Type options: ${typeDefaults.length} (default: support)`);

  const priorityDefaults = [
    { key: "low", label: "Low", order: 1, isDefault: false },
    { key: "medium", label: "Medium", order: 2, isDefault: true },
    { key: "high", label: "High", order: 3, isDefault: false },
    { key: "urgent", label: "Urgent", order: 4, isDefault: false },
  ] as const;

  await Promise.all(
    priorityDefaults.map((p) =>
      prisma.ticketPriorityOption.upsert({
        where: { key: p.key },
        update: {
          label: p.label,
          order: p.order,
          active: true,
          isDefault: p.isDefault,
          colorKey: null,
        },
        create: {
          key: p.key,
          label: p.label,
          order: p.order,
          active: true,
          isDefault: p.isDefault,
          colorKey: null,
        },
      })
    )
  );

  await prisma.ticketPriorityOption.updateMany({ data: { isDefault: false } });
  await prisma.ticketPriorityOption.update({ where: { key: "medium" }, data: { isDefault: true } });
  info(`Priority options: ${priorityDefaults.length} (default: medium)`);

  const supportTypeDefaults = [
    { key: "remote", label: "Remote", order: 1, isDefault: true },
    { key: "on_site", label: "Onsite", order: 2, isDefault: false },
    { key: "consultation", label: "Consultation", order: 3, isDefault: false },
    { key: "phone_call", label: "Phone Call", order: 4, isDefault: false },
  ] as const;

  await Promise.all(
    supportTypeDefaults.map((s) =>
      prisma.ticketSupportTypeOption.upsert({
        where: { key: s.key },
        update: {
          label: s.label,
          order: s.order,
          active: true,
          isDefault: s.isDefault,
        },
        create: {
          key: s.key,
          label: s.label,
          order: s.order,
          active: true,
          isDefault: s.isDefault,
        },
      })
    )
  );

  await prisma.ticketSupportTypeOption.updateMany({ data: { isDefault: false } });
  await prisma.ticketSupportTypeOption.update({ where: { key: "remote" }, data: { isDefault: true } });
  info(`Support types: ${supportTypeDefaults.length} (default: remote)`);

  const billingTypeDefaults = [
    { key: "billable", label: "Billable", order: 1, isDefault: true },
    { key: "non_billable", label: "Non Billable", order: 2, isDefault: false },
    { key: "need_review", label: "Need Review", order: 3, isDefault: false },
  ] as const;

  await Promise.all(
    billingTypeDefaults.map((b) =>
      prisma.ticketBillingTypeOption.upsert({
        where: { key: b.key },
        update: {
          label: b.label,
          order: b.order,
          active: true,
          isDefault: b.isDefault,
        },
        create: {
          key: b.key,
          label: b.label,
          order: b.order,
          active: true,
          isDefault: b.isDefault,
        },
      })
    )
  );

  await prisma.ticketBillingTypeOption.updateMany({ data: { isDefault: false } });
  await prisma.ticketBillingTypeOption.update({ where: { key: "billable" }, data: { isDefault: true } });
  info(`Billing types: ${billingTypeDefaults.length} (default: billable)`);

  // =========================================================
  // DEFAULT NOTIFICATION TEMPLATES
  // =========================================================
  step("Notification templates");
  await Promise.all(
    DEFAULT_NOTIFICATION_TEMPLATES.map((t) =>
      prisma.notificationTemplate.upsert({
        where: { type_variant: { type: t.type, variant: t.variant } },
        update: {
          titleTemplate: t.titleTemplate,
          bodyTemplate: t.bodyTemplate,
        },
        create: {
          type: t.type,
          variant: t.variant,
          titleTemplate: t.titleTemplate,
          bodyTemplate: t.bodyTemplate,
        },
      })
    )
  );

  info(`Upserted ${DEFAULT_NOTIFICATION_TEMPLATES.length} templates`);

  // =========================================================
  // WELCOME TICKET (INTERNAL ONLY, NO CLIENT)
  // =========================================================
  step("Welcome ticket");
  const welcomeTicket = await prisma.ticket.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "👋 Welcome to StackTrack!",
      detail: {
        text: `Welcome aboard!

This is your first internal-only ticket — seeded automatically so you can confirm your backend and frontend are connected.

✅ Try these:
• View this ticket in your dashboard
• Update its status or priority
• Add a comment or time entry
• Assign it to another user (multi-assignee supported)

Have fun exploring StackTrack 🚀`,
        internal: true,
      },
      priority: TicketPriority.low,
      status: "new",
      type: "support",
      internalOnly: true,
      createdById: adminUser.id,
      assignedToId: adminUser.id,
      assignees: {
        create: [
          {
            userId: adminUser.id,
            assignedById: adminUser.id,
            isPrimary: true,
          },
        ],
      },
    },
  });

  info(`Upserted: ${welcomeTicket.title}`);

  // =========================================================
  // WELCOME NOTIFICATIONS
  // =========================================================
  step("Welcome notification");
  await prisma.notification.deleteMany({
    where: {
      userId: adminUser.id,
      type: "ticket.created",
      entityType: "ticket",
      entityId: welcomeTicket.id,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        actorUserId: adminUser.id,
        type: "ticket.created",
        entityType: "ticket",
        entityId: welcomeTicket.id,
        ticketNumber: (welcomeTicket as any).number ?? null,
        title: "Welcome to StackTrack!",
        body: `Hey ${adminUser.name}, your StackTrack environment is ready to roll!

An internal-only Welcome Ticket has been created for you. Test commenting, assigning, or tracking time. 🚀`,
        preview: `Welcome ticket created: ${(welcomeTicket as any).title ?? ""}`.trim(),
      },
    ],
  });

  info("Added welcome notification");

  // =========================================================
  // VALIDATION
  // =========================================================
  step("Validation");
  const [permCount, roleCount, userCount] = await Promise.all([
    prisma.permission.count(),
    prisma.role.count({ where: { name: systemAdminRole.name } }),
    prisma.user.count({ where: { email: adminEmail } }),
  ]);
  assertSeed(permCount >= permissionNames.length, "Permissions missing");
  assertSeed(roleCount === 1, "System Administrator role missing");
  assertSeed(userCount === 1, "Admin user missing");

  const statusDefaultCount = await prisma.ticketStatusOption.count({ where: { isDefault: true } });
  const typeDefaultCount = await prisma.ticketTypeOption.count({ where: { isDefault: true } });
  const priorityDefaultCount = await prisma.ticketPriorityOption.count({ where: { isDefault: true } });
  const supportTypeDefaultCount = await prisma.ticketSupportTypeOption.count({ where: { isDefault: true } });
  const billingTypeDefaultCount = await prisma.ticketBillingTypeOption.count({ where: { isDefault: true } });
  assertSeed(statusDefaultCount === 1, "Ticket status default is not exactly 1");
  assertSeed(typeDefaultCount === 1, "Ticket type default is not exactly 1");
  assertSeed(priorityDefaultCount === 1, "Ticket priority default is not exactly 1");
  assertSeed(supportTypeDefaultCount === 1, "Ticket support type default is not exactly 1");
  assertSeed(billingTypeDefaultCount === 1, "Ticket billing type default is not exactly 1");

  const templateCount = await prisma.notificationTemplate.count();
  assertSeed(
    templateCount >= DEFAULT_NOTIFICATION_TEMPLATES.length,
    "Notification templates missing"
  );

  const welcomeTicketCheck = await prisma.ticket.findUnique({ where: { id: welcomeTicket.id } });
  assertSeed(Boolean(welcomeTicketCheck), "Welcome ticket missing");

  const welcomeNotifCount = await prisma.notification.count({
    where: { userId: adminUser.id, type: "ticket.created", entityId: welcomeTicket.id },
  });
  assertSeed(welcomeNotifCount >= 1, "Welcome notification missing");

  info("All checks passed");

  // =========================================================
  // DONE
  // =========================================================
  hr();
  step("Seed complete");
  info(`Admin: ${adminUser.email}`);
  if (!existingAdmin || process.env.STACKTRACK_FORCE_ADMIN_PASSWORD === "1") {
    info(`Admin password: ${adminPassword}`);
  } else {
    info("Admin password: (unchanged)");
  }
  info(`Welcome ticket: ${welcomeTicket.title}`);
}

main()
  .catch((e) => {
    hr();
    step("Seed failed");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
