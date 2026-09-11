export function extractError(err, fallback = "Something went wrong") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return err?.errors?.[0] || err?.message || fallback;
}

export default extractError;
