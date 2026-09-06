import slack from "./slack.js";
import notion from "./notion.js";
import email from "./email.js";
import imageGen from "./imageGen.js";

export * from "./slack.js";
export * from "./notion.js";
export * from "./email.js";
export * from "./imageGen.js";

export const integrations = {
  slack,
  notion,
  email,
  imageGen,
};

export default integrations;



