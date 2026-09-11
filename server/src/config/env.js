import dotenv from "dotenv";

dotenv.config();

function collectApiKeys(prefix) {
  const keys = new Set();
  const regex = new RegExp(`^${prefix}_API_KEYS?(_?\\d+)?$`, "i");
  Object.keys(process.env).forEach((k) => {
    if (regex.test(k) && process.env[k]) {
      process.env[k]
        .split(",")
        .map((val) => val.trim())
        .filter(Boolean)
        .forEach((key) => keys.add(key));
    }
  });
  return Array.from(keys);
}

const groqKeys = collectApiKeys("GROQ");
const geminiKeys = collectApiKeys("GEMINI");

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-do-not-use-in-prod"),
  accessTokenSecret:
    process.env.ACCESS_TOKEN_SECRET ||
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-access-secret-32-chars-min!"),
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET ||
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-refresh-secret-32-chars-min!"),
  guestTokenSecret:
    process.env.GUEST_TOKEN_SECRET ||
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-guest-secret-32-chars-min!"),
  groqApiKeys: groqKeys,
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  geminiApiKey: geminiKeys[0] || "",
  geminiApiKeys: geminiKeys,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  notionToken: process.env.NOTION_TOKEN || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
};

if (process.env.NODE_ENV === "production") {
  if (!config.accessTokenSecret || !config.refreshTokenSecret || !config.guestTokenSecret) {
    throw new Error("FATAL: Auth secrets (ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, GUEST_TOKEN_SECRET) must be set in production!");
  }
}

/**
 * Validates environment variables on server startup and outputs a clean diagnostic.
 */
export function validateEnvironment() {
  const diagnostics = [
    { service: "Database", status: process.env.DATABASE_URL ? "CONFIGURED" : "MISSING" },
    { service: "JWT Secret", status: process.env.JWT_SECRET ? "CONFIGURED" : "DEFAULT" },
    { service: "Access Token Secret",  status: process.env.ACCESS_TOKEN_SECRET  ? "CONFIGURED" : "DEFAULT (dev)" },
    { service: "Refresh Token Secret", status: process.env.REFRESH_TOKEN_SECRET ? "CONFIGURED" : "DEFAULT (dev)" },
    { service: "Guest Token Secret",   status: process.env.GUEST_TOKEN_SECRET   ? "CONFIGURED" : "DEFAULT (dev)" },
    { service: "Groq AI", status: config.groqApiKeys.length > 0 ? "AVAILABLE" : "NOT SET" },
    { service: "Gemini AI", status: config.geminiApiKey ? "AVAILABLE" : "NOT SET" },
  ];

  console.log("\n--- [mindMesh Environment Diagnostics] ---");
  for (const item of diagnostics) {
    const icon = item.status === "CONFIGURED" || item.status === "AVAILABLE" ? "✓" : "⚠";
    console.log(`  ${icon} ${item.service.padEnd(15)} : ${item.status}`);
  }
  console.log("-------------------------------------------\n");

  return diagnostics;
}


