class GoogleSyncAdapter {
  constructor() {
    this.enabled = false;
    this.accessToken = "";
  }

  async connect() {
    throw new Error("Google sync needs OAuth Client ID and Google Drive API setup.");
  }

  async pushSnapshot() {
    if (!this.enabled) return { ok: false, reason: "sync-disabled" };
    throw new Error("Google sync push is not configured yet.");
  }

  async pullSnapshot() {
    if (!this.enabled) return { ok: false, reason: "sync-disabled" };
    throw new Error("Google sync pull is not configured yet.");
  }
}

window.GoogleSyncAdapter = GoogleSyncAdapter;
