// src/nucleus/runtime/structuralEquals.ts
//
// Deep structural equality for plain JSON-shaped values (the contract
// payloads every subsystem exchanges). No library dependency for
// something this small; key order must not matter, which rules out a
// naive JSON.stringify comparison.

export function structuralEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== "object") return false;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray || bIsArray) {
    if (!aIsArray || !bIsArray) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => structuralEquals(item, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(bObj, key) && structuralEquals(aObj[key], bObj[key]),
  );
}
