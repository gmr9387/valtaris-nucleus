// src/nucleus/contracts/NucleusEvent.ts

import { NucleusIdentity } from "./NucleusIdentity";
import type { Dynamic } from "../types/dynamic";

/**
 * NucleusEvent
 *
 * The constitutional event contract for the Valtara ecosystem.
 * Every subsystem emits events in this shape.
 *
 * Nucleus = KNOW
 * Weaver = FIND
 * Guardian = ALLOW
 * Glue = DO
 * DualPay = SPECIALIZE
 *
 * Events are the backbone of the ecosystem loop:
 * KNOW → FIND → ALLOW → DO → OBSERVE → KNOW
 */

export interface NucleusEvent {
  id: string;
  source: string; // subsystem name: nucleus, weaver, guardian, glue, dualpay, etc.
  type: string; // event type: workflow.started, opportunity.detected, action.authorized, etc.

  context: NucleusIdentity;

  payload: Dynamic; // subsystem-specific data

  timestamp: string;
}

/**
 * Utility: createEvent
 *
 * Standardizes event creation across subsystems.
 * Prevents shape drift and ensures constitutional consistency.
 */
export function createEvent(params: {
  source: string;
  type: string;
  context: NucleusIdentity;
  payload: Dynamic;
}): NucleusEvent {
  return {
    id: crypto.randomUUID(),
    source: params.source,
    type: params.type,
    context: params.context,
    payload: params.payload,
    timestamp: new Date().toISOString(),
  };
}
