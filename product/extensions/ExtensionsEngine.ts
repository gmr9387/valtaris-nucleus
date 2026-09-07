import { fetchExtensions, installExtension, removeExtension } from "./ExtensionsAPI";

export class ExtensionsEngine {
  private list: any[] = [];

  async load() {
    this.list = await fetchExtensions();
  }

  getAll() {
    return this.list;
  }

  async install(id: string) {
    await installExtension(id);
    this.list = await fetchExtensions();
  }

  async remove(id: string) {
    await removeExtension(id);
    this.list = await fetchExtensions();
  }
}

export const extensionsEngine = new ExtensionsEngine();
