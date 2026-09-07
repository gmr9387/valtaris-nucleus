import { fetchAuditLogs, fetchAuditLog } from "./AuditAPI";

export class AuditEngine {
  private logs: any[] = [];
  private selected: any = null;

  async load() {
    this.logs = await fetchAuditLogs();
  }

  getAll() {
    return this.logs;
  }

  async select(id: string) {
    this.selected = await fetchAuditLog(id);
  }

  getSelected() {
    return this.selected;
  }
}

export const auditEngine = new AuditEngine();
