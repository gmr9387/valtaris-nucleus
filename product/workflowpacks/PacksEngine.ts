import {
  fetchWorkflowPacks,
  installWorkflowPack,
  removeWorkflowPack
} from "./PacksAPI";

export class PacksEngine {
  private packs: any[] = [];

  async load() {
    this.packs = await fetchWorkflowPacks();
  }

  getAll() {
    return this.packs;
  }

  async install(id: string) {
    await installWorkflowPack(id);
    this.packs = await fetchWorkflowPacks();
  }

  async remove(id: string) {
    await removeWorkflowPack(id);
    this.packs = await fetchWorkflowPacks();
  }
}

export const packsEngine = new PacksEngine();
