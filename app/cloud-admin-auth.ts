import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "./chatgpt-auth";

type AdminBindings = {
  ADMIN_USER_IDS?: string;
  ADMIN_USER_EMAILS?: string;
};

function configuredValues(value?: string) {
  return new Set((value ?? "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean));
}

export function isCloudAdmin(user: ChatGPTUser) {
  const bindings = env as unknown as AdminBindings;
  const ids = configuredValues(bindings.ADMIN_USER_IDS);
  const emails = configuredValues(bindings.ADMIN_USER_EMAILS);
  return ids.has(user.userId.toLowerCase()) || emails.has(user.email.toLowerCase());
}
