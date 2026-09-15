export * from "./contractDefinition";
export * from "./contractRegistry";
export * from "./contractBindings";

// Per-stage contract definitions for the real claims pipeline (see
// runtime/osPipeline.ts). Each file's registerContract() call is a
// module-load side effect -- these must be imported (directly, or via
// this barrel) before validateContract() can find them.
export * from "./opportunityContract";
export * from "./recommendationContract";
export * from "./authorizationContract";
export * from "./executionContract";
export * from "./paymentContract";
