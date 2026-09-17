// src/nucleus/adapters/adapterSandbox.ts
//
// gapMap.md's "Adapter Registry + Sandbox" (#18) was half-closed earlier
// this session: dependency-ordered loading (adapterAutoWireEngine) now
// runs on real boot, not just CI. The "sandbox" half -- isolated/safe
// execution, distinct from the loading itself -- was never built.
//
// adapterAutoWireEngine.autoWire() resolves each adapter's *direct*
// dependencies (resolveDependencies()) and loads them in whatever order
// adapterManifest.adapters happens to list -- it works today because
// that list is hand-ordered so every dependency already precedes its
// dependent, but it has no cycle detection and no unknown-adapter
// detection: a manifest edit that got the order wrong, or introduced a
// cycle, would only surface as a confusing runtime failure during a
// real boot. This sandbox resolves the *transitive* dependency chain
// for a candidate adapter (or the whole manifest) against its own
// isolated visited-set, entirely separate from adapterState.loaded --
// the real, shared state autoWire() commits to on real boot -- so
// trying or validating a candidate here can never affect what's
// actually live, and a broken graph can be caught before it ever
// reaches a real boot.

import { adapterRegistry } from "./adapterRegistry";
import { adapterDependencyGraph } from "./adapterDependencyGraph";
import { adapterManifest } from "./adapterManifest";

export type SandboxLoadResult = {
  adapter: string;
  resolvable: boolean;
  loadOrder: string[];
  error?: string;
};

export class AdapterSandbox {
  tryLoad(adapterName: string): SandboxLoadResult {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const loadOrder: string[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`circular dependency detected at "${name}"`);
      }
      if (!(name in adapterRegistry)) {
        throw new Error(`unknown adapter "${name}"`);
      }

      visiting.add(name);
      const entry = adapterDependencyGraph.find((d) => d.adapter === name);
      for (const dep of entry?.dependsOn ?? []) {
        visit(dep);
      }
      visiting.delete(name);

      visited.add(name);
      loadOrder.push(name);
    };

    try {
      visit(adapterName);
      return { adapter: adapterName, resolvable: true, loadOrder };
    } catch (err) {
      return {
        adapter: adapterName,
        resolvable: false,
        loadOrder,
        error: (err as Error).message,
      };
    }
  }

  tryLoadAll(): { ok: boolean; results: SandboxLoadResult[] } {
    const results = adapterManifest.adapters.map((a) => this.tryLoad(a));
    return { ok: results.every((r) => r.resolvable), results };
  }
}

export const adapterSandbox = new AdapterSandbox();
