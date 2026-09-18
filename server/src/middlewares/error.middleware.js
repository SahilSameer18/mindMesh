import { sendError } from "../utils/response.js";

// Raw Prisma errors can include column/constraint/query details that
// shouldn't reach the client — everything else in this codebase throws
// plain, deliberately user-facing Error messages, so only these get masked.
const isPrismaError = (err) =>
  /^Prisma/.test(err?.constructor?.name || "") || /^P\d{4}$/.test(err?.code || "");

export const errorHandler = (err, _req, res, _next) => {
  console.error("[Server Error]", err);
  const message = isPrismaError(err) ? "Internal Server Error" : err.message || "Internal Server Error";
  return sendError(res, message, [], 500);
};

export const notFoundHandler = (_req, res) => {
  return sendError(res, "Resource not found", [], 404);
};
