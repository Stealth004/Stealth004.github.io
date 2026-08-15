// SIEM PBQ v1.0.3 runtime entrypoint.
// Apply evidence-supported scope corrections before the stable v1.0.2 app initializes.
import {applyUiIntegrity} from "./training-integrity.mjs";
await import("./app.mjs");
applyUiIntegrity();
