import {
  fetchMonitorPacks,
  installMonitorPack,
  removeMonitorPack
} from "./MonitorAPI";

export class MonitorEngine {
  private packs: any[] = [];

  async load() {
    this.packs = await fetchMonitorPacks();
  }

  getAll() {
    return this.packs;
  }

  async install(id: string) {
    await installMonitorPack(id);
    this.packs = await fetchMonitorPacks();
  }

  async remove(id: string) {
    await removeMonitorPack(id);
    this.packs = await fetchMonitorPacks();
  }
}

export const monitorEngine = new MonitorEngine();
