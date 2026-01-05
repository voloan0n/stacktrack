import type { FastifyReply, FastifyRequest } from "fastify";

export type Request = FastifyRequest & {
  body: any;
  query: any;
  params: any;
  headers: any;
};
export type Reply = FastifyReply;
