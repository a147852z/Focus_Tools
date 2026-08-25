import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import { isCloudAdmin } from "../cloud-admin-auth";
import CloudDataManager from "./cloud-data-manager";

export const dynamic = "force-dynamic";

export default async function CloudDataPage() {
  const user = await requireChatGPTUser("/cloud-data");
  return <CloudDataManager displayName={user.displayName} email={user.email} isAdmin={isCloudAdmin(user)} signOutHref={chatGPTSignOutPath("/")} />;
}
