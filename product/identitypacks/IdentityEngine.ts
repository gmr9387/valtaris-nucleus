import {
  fetchIdentityPacks,
  installIdentityPack,
  removeIdentityPack
} from "./IdentityAPI";

export class IdentityEngine {
  private packs: any[] = [];

  async load() {
    this.packs = await fetchIdentityPacks();
  }

  getAll() {
    return this.packs;
  }

  async install(id: string) {
    await installIdentityPack(id);
    this.packs = await fetchIdentityPacks();
  }

  async remove(id: string) {
    await removeIdentityPack(id);
    this.packs = await fetchIdentityPacks();
  }
}

export const identityEngine = new IdentityEngine();
