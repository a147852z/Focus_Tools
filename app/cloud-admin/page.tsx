import { isCloudAdmin } from "../cloud-admin-auth";
import { requireChatGPTUser } from "../chatgpt-auth";
import CloudAdminManager from "./cloud-admin-manager";

export const dynamic = "force-dynamic";

export default async function CloudAdminPage() {
  const user = await requireChatGPTUser("/cloud-admin");
  if (!isCloudAdmin(user)) {
    return <main className="cloud-page"><section className="cloud-panel cloud-empty"><h1>沒有管理權限</h1><p>這個頁面只開放給已設定的雲端資料管理者。</p><a className="cloud-manage-link" href="/?screen=me">返回專注房間</a></section></main>;
  }
  return <CloudAdminManager adminName={user.displayName} />;
}
