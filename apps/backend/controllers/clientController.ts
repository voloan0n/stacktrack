import { prisma } from "../config/prisma";
import type { Reply, Request } from "../lib/http";
import { checkSession } from "../lib/session";

export const ClientController = {
  // ============================================================
  // LIST CLIENTS (paginated list view)
  // ============================================================
  async listPaginated(request: Request, reply: Reply) {
    try {
      const {
        page = 1,
        limit = 25,
        search = "",
        type: _type,
        sort = "createdAt",
        order = "desc",
      } = request.query;

      const pageNum = Math.max(parseInt(page), 1);
      const takeNum = Math.min(Math.max(parseInt(limit), 1), 100);
      const skipNum = (pageNum - 1) * takeNum;

      const where: any = {};

      // `type` is kept in the query for backward compatibility,
      // but we no longer distinguish between company/individual at the DB level.

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ];
      }

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip: skipNum,
          take: takeNum,
          orderBy: { [sort]: order },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            addressCity: true,
            addressState: true,
            country: true,
            _count: {
              select: {
                tickets: true,
              },
            },
          },
        }),
        prisma.client.count({ where }),
      ]);

      return reply.send({
        success: true,
        page: pageNum,
        limit: takeNum,
        total,
        clients,
      });

    } catch (err) {
      console.error("ClientController.listPaginated failed:", err);
      return reply.code(500).send({
        success: false,
        message: "Failed to load client list.",
      });
    }
  },

  // ============================================================
  // GET CLIENT (full detail view)
  // ============================================================
  async getById(request: Request, reply: Reply) {
    try {
      const session = await checkSession(request);
      if (!session) {
        return reply.code(401).send({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = request.params;

      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          tickets: {
            select: {
              id: true,
              number: true,
              title: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10, // show recent history
          },
          notes: {
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!client) {
        return reply.code(404).send({
          success: false,
          message: "Client not found",
        });
      }

      // Normalize for FE
      const normalized = {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,

        miscNotes: client.miscNotes ?? "",

        address: {
          line1: client.addressLine1 ?? "",
          line2: "",
          city: client.addressCity ?? "",
          state: client.addressState ?? "",
          postal: client.addressPostal ?? "",
          country: client.country ?? "US",
        },

        tickets: client.tickets.map(t => ({
          id: t.id,
          displayId: `#${String(t.number).padStart(6, "0")}`,
          title: t.title,
          status: t.status,
          createdAt: t.createdAt,
        })),

        notes: client.notes.map(n => ({
          id: n.id,
          title: n.title,
          createdAt: n.createdAt,
        })),
      };

      return reply.send({
        success: true,
        client: normalized,
      });

    } catch (err) {
      console.error("ClientController.getById failed:", err);
      return reply.code(500).send({
        success: false,
        message: "Failed to load client details",
      });
    }
  },

  // ============================================================
  // CREATE CLIENT
  // ============================================================
  async create(request: Request, reply: Reply) {
    try {
      const session = await checkSession(request);
      if (!session) {
        return reply.code(401).send({ success: false, message: "Not authenticated" });
      }

      const {
        name,
        type: _type,
        email,
        phone,
        addressLine1,
        addressCity,
        addressState,
        addressPostal,
        country,
        notes,
      } = request.body;

      const client = await prisma.client.create({
        data: {
          name,
          email,
          phone,
          miscNotes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
          addressLine1: addressLine1?.trim() || null,
          addressCity: addressCity?.trim() || null,
          addressState: addressState?.trim() || null,
          addressPostal: addressPostal?.trim() || null,
          country: country?.trim() || "US",
        },
      });

      return reply.code(201).send({
        success: true,
        client,
      });
    } catch (err) {
      console.error("ClientController.create failed:", err);
      return reply.code(500).send({
        success: false,
        message: "Failed to create client.",
      });
    }
  },

  // ============================================================
  // UPDATE CLIENT
  // ============================================================
  async update(request: Request, reply: Reply) {
    try {
      const session = await checkSession(request);
      if (!session) {
        return reply.code(401).send({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = request.params;
      const body = request.body;
      const countryRaw =
        typeof body.country === "string"
          ? body.country
          : typeof body.addressCountry === "string"
            ? body.addressCountry
            : undefined;

      // Clean + normalize fields
      const updateData = {
        name: body.name?.trim(),
        email: body.email || null,
        phone: body.phone || null,
        miscNotes: typeof body.notes === "string" ? body.notes.trim() : null,
        addressLine1: body.addressLine1?.trim() || body.address?.trim() || null,
        addressCity: body.addressCity?.trim() || null,
        addressState: body.addressState?.trim() || null,
        addressPostal: body.addressPostal?.trim() || null,
        country: countryRaw?.trim() || "US",
        updatedAt: new Date(),
      };

      const updated = await prisma.client.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        success: true,
        client: updated,
      });

    } catch (err) {
      console.error("ClientController.update failed:", err);
      return reply.code(500).send({
        success: false,
        message: "Failed to update client.",
      });
    }
  },

  // ============================================================
  // DELETE CLIENT
  // ============================================================
  async remove(request: Request, reply: Reply) {
    try {
      const session = await checkSession(request);
      if (!session) {
        return reply.code(401).send({ success: false, message: "Not authenticated" });
      }

      const { id } = request.params;

      await prisma.client.delete({
        where: { id },
      });

      return reply.send({
        success: true,
        message: "Client deleted.",
      });
    } catch (err) {
      console.error("ClientController.remove failed:", err);
      return reply.code(500).send({
        success: false,
        message: "Failed to delete client.",
      });
    }
  },
};
