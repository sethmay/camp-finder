// Prefilled link to the community correction form (Tally). Registry data lives upstream in
// open-scout-api; this file only builds the intake URL — no submission logic runs here (the
// site is static, no backend).
//
// GO-LIVE: set CORRECTION_FORM_URL to the published Tally form (e.g. "https://tally.so/r/wABC12").
// Until it is set, correctionHref falls back to the /about#corrections explainer so no link 404s.
// The hidden-field keys below (camp_id, camp_name, camp_state, src) must exist as hidden fields
// in the Tally form for the prefill to land.

import type { Camp } from "./types";
import { withBase } from "./paths";

/** The published Tally form URL, or "" until it exists. */
export const CORRECTION_FORM_URL: string = "https://tally.so/r/xXbNDd";

/** Where the correction click originated, tagged into the form for triage context. */
export type CorrectionSource = "camp" | "compare" | "about" | "general";

/** Link to the correction form, prefilling the camp (when known) into the Tally hidden fields
 *  and tagging the originating surface. Also carries the camp's current feature CODES in a hidden
 *  `camp_features` field — invisible to the submitter, it gives the triage agent "what we list
 *  today" so add/remove requests are unambiguous. Falls back to the about-page explainer when the
 *  form URL is unset. `formUrl` is injectable for tests; production callers use the module default. */
export function correctionHref(
  camp?: Pick<Camp, "id" | "name" | "state" | "features">,
  src: CorrectionSource = "general",
  formUrl: string = CORRECTION_FORM_URL,
): string {
  if (!formUrl) return withBase("/about#corrections");
  const p = new URLSearchParams();
  if (camp) {
    p.set("camp_id", camp.id);
    p.set("camp_name", camp.name);
    if (camp.state) p.set("camp_state", camp.state);
    if (camp.features.length) p.set("camp_features", camp.features.join(","));
  }
  p.set("src", src);
  return `${formUrl}?${p.toString()}`;
}

/** True once the form is configured — lets a surface show the direct form CTA vs. the explainer. */
export const CORRECTION_FORM_READY = CORRECTION_FORM_URL !== "";
