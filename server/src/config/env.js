import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-do-not-use-in-prod"),
  groqApiKeys: (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  geminiApiKey: (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")[0]?.trim() || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  notionToken: process.env.NOTION_TOKEN || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
};

/**
 * Validates environment variables on server startup and outputs a clean diagnostic.
 */
export function validateEnvironment() {
  const diagnostics = [
    { service: "Database", status: process.env.DATABASE_URL ? "CONFIGURED" : "MISSING" },
    { service: "JWT Secret", status: process.env.JWT_SECRET ? "CONFIGURED" : "DEFAULT" },
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