import {
  fetchMarketplaceItems,
  installMarketplaceItem,
  removeMarketplaceItem
} from "./MarketplaceAPI";

export class MarketplaceEngine {
  private items: any[] = [];

  async load() {
    this.items = await fetchMarketplaceItems();
  }

  getAll() {
    return this.items;
  }

  async install(id: string) {
    await installMarketplaceItem(id);
    this.items = await fetchMarketplaceItems();
  }

  async remove(id: string) {
    await removeMarketplaceItem(id);
    this.items = await fetchMarketplaceItems();
  }
}

export const marketplaceEngine = new MarketplaceEngine();
