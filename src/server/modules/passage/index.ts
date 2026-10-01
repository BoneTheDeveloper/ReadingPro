// The passage module's public API. Other modules import from here, never from its files.
export { passageRoutes } from "./passage-routes";
export { requireOwnedPassage, requireReadyPassage } from "./passage-service";
