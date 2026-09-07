import { fetchAnalytics, fetchUsage, fetchEvents } from "./AnalyticsAPI";

export class AnalyticsEngine {
  private analytics: any = null;
  private usage: any = null;
  private events: any[] = [];

  async load() {
    this.analytics = await fetchAnalytics();
    this.usage = await fetchUsage();
    this.events = await fetchEvents();
  }

  getSummary() {
    return {
      totalUsers: this.analytics?.totalUsers || 0,
      totalWorkflows: this.analytics?.totalWorkflows || 0,
      totalPayments: this.analytics?.totalPayments || 0
    };
  }

  getUsage() {
    return this.usage || {};
  }

  getEvents() {
    return this.events || [];
  }
}

export const analyticsEngine = new AnalyticsEngine();
