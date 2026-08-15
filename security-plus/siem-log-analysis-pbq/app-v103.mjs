// SIEM PBQ runtime entrypoint. v1.0.3 scope/training integrity plus v1.0.4
// evidence taxonomy and timeline-scoring integrity overlays.
import {applyUiIntegrity} from "./training-integrity.mjs";
await import("./app.mjs");
applyUiIntegrity();
const {applyEvidenceScoringIntegrity} = await import("./evidence-scoring-ui-v104.mjs");
applyEvidenceScoringIntegrity();
