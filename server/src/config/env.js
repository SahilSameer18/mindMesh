import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "mindmesh-jwt-secret-session-key-2026",
  groqApiKey: process.env.GROQ_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  notionToken: process.env.NOTION_TOKEN || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
};
