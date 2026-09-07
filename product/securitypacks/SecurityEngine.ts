import {
  fetchSecurityPacks,
  installSecurityPack,
  removeSecurityPack
} from "./SecurityAPI";

export class SecurityEngine {
  private packs: any[] = [];

  async load() {
    this.packs = await fetchSecurityPacks();
  }

  getAll() {
    return this.packs;
  }

  async install(id: string) {
    await installSecurityPack(id);
    this.packs = await fetchSecurityPacks();
  }

  async remove(id: string) {
    await removeSecurityPack(id);
    this.packs = await fetchSecurityPacks();
  }
}

export const securityEngine = new SecurityEngine();
