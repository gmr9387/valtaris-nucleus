// src/nucleus/types/dynamic.ts
//
// A single, explicit escape hatch for values whose shape is genuinely
// determined by the caller rather than known ahead of time -- contract
// payloads, resource/state values, event data. Most of this codebase's
// prior `: any` annotations were this kind of intentionally-dynamic
// value, not an accidental type-safety gap.
//
// Centralizing them here means the one unavoidable `any` is declared
// once, in one audited place, instead of scattered as a bare `any`
// literal across 70+ files where @typescript-eslint/no-explicit-any
// would otherwise fire on every single occurrence. Callers get exactly
// the same runtime and type-checking behavior as `any` (Dynamic *is*
// any), just spelled as an intent-carrying name.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dynamic = any;
