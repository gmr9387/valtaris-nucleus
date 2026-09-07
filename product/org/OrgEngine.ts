import { fetchOrgs, switchOrg, fetchOrgDetails } from "./OrgAPI";

export class OrgEngine {
  private orgs: any[] = [];
  private current: any = null;

  async load() {
    this.orgs = await fetchOrgs();
  }

  getAll() {
    return this.orgs;
  }

  async select(id: string) {
    await switchOrg(id);
    this.current = await fetchOrgDetails(id);
  }

  getCurrent() {
    return this.current;
  }
}

export const orgEngine = new OrgEngine();
