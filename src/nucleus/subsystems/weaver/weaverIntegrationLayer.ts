// src/nucleus/subsystems/weaver/weaverIntegrationLayer.ts

import { WeaverOpportunityEngine } from "./weaverOpportunityEngine";
import { WeaverRecommendationEngine } from "./weaverRecommendationEngine";
import type { Dynamic } from "../../types/dynamic";

export class WeaverIntegrationLayer {
  static processOpportunity(payload: Dynamic) {
    return WeaverOpportunityEngine.evaluate(payload);
  }

  static processRecommendation(payload: Dynamic) {
    return WeaverRecommendationEngine.evaluate(payload);
  }
}
