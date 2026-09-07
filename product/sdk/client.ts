export class ValtarisClient {
  private api: string;

  constructor(api: string) {
    this.api = api;
  }

  async get(path: string) {
    const res = await fetch(`${this.api}${path}`);
    return res.json();
  }

  async post(path: string, body: any) {
    const res = await fetch(`${this.api}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async workflows() {
    return this.get("/api/workflows");
  }

  async triggerWorkflow(id: string) {
    return this.post(`/api/workflows/${id}/trigger`, {});
  }

  async payments() {
    return this.get("/api/payments");
  }

  async identities() {
    return this.get("/api/identity");
  }

  async analytics() {
    return this.get("/api/analytics");
  }

  async extensions() {
    return this.get("/api/extensions");
  }
}
