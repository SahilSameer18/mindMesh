import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "mindmesh-jwt-secret-session-key-2026",
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
