/**
 * Unified Response Formatter
 * Strict rule compliance:
 * Success: { "success": true, "message": "...", "data": { ... } }
 * Failure: { "success": false, "message": "...", "errors": [ ... ] }
 */

export const sanitizeData = (data) => {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const clean = { ...data };
  delete clean.__v;
  return clean;
};

export const sendSuccess = (res, message = "Success", data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: sanitizeData(data),
  });
};

export const sendError = (res, message = "An error occurred", errors = [], statusCode = 400) => {
  const formattedErrors = Array.isArray(errors) ? errors : [errors];
  return res.status(statusCode).json({
    success: false,
    message,
    errors: formattedErrors,
  });
};
