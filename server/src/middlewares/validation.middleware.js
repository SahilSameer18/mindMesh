import { sendError } from "../utils/response.js";

/**
 * Higher-order schema validation middleware.
 * Validates request payload against expected rules and returns unified 422 JSON on failure.
 *
 * @param {Object} schema - Object defining validation rules per field
 * @param {"body" | "query" | "params"} [source="body"] - Request property to validate
 * @returns {Function} Express middleware function
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const data = req[source] || {};
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const val = data[field];

      // Required check
      if (rules.required && (val === undefined || val === null || val === "")) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      // If value is optional and not provided, skip further checks
      if (val === undefined || val === null || val === "") {
        continue;
      }

      // Type check
      if (rules.type && typeof val !== rules.type) {
        errors.push(`Field '${field}' must be of type ${rules.type}`);
        continue;
      }

      // Minimum string length
      if (rules.minLength && typeof val === "string" && val.trim().length < rules.minLength) {
        errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
      }

      // Email format
      if (rules.isEmail && typeof val === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          errors.push(`Field '${field}' must be a valid email address`);
        }
      }

      // Allowed enum values
      if (rules.enum && Array.isArray(rules.enum) && !rules.enum.includes(val)) {
        errors.push(`Field '${field}' must be one of: ${rules.enum.join(", ")}`);
      }
    }

    if (errors.length > 0) {
      return sendError(res, "Validation failed", errors, 422);
    }

    next();
  };
}

export default validate;
