// src/nucleus/tests/guardianSubsystemPermissions.test.ts

import { describe, it, expect } from "vitest";

import { getAllSubsystems } from "../subsystems/subsystemRegistry";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import { GuardianRuntime } from "../subsystems/guardian/guardianRuntime";

describe("Guardian subsystem permissions", () => {
  it("is registered alongside every other constitutional subsystem", () => {
    registerAllSubsystems();
    const ids = getAllSubsystems().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["guardian", "dualpay", "glue", "weaver"]));
  });

  it("only handles the authorization contract, not other subsystems' contracts", async () => {
    await expect(GuardianRuntime.handle("opportunity", {})).rejects.toThrow();
    await expect(GuardianRuntime.handle("recommendation", {})).rejects.toThrow();
    await expect(GuardianRuntime.handle("execution", {})).rejects.toThrow();
    await expect(GuardianRuntime.handle("payment", {})).rejects.toThrow();
  });
});
