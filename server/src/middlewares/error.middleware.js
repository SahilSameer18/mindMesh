import { sendError } from "../utils/response.js";

export const errorHandler = (err, _req, res, _next) => {
  console.error("[Server Error]", err);
  return sendError(res, err.message || "Internal Server Error", [], 500);
};

export const notFoundHandler = (_req, res) => {
  return sendError(res, "Resource not found", [], 404);
};

