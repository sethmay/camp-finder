// Pre-camp checklist builder: a curated Scouts BSA camp packing/prep list, tailored to what a
// camp's registry data tells us (camp_type, features, elevation, July temps). Pure + tested.
// It is a STARTING POINT, not the camp's official list — the checklist page links out to the
// council for the authoritative version.
import type { Camp } from "./types";
import { expandFeatures } from "./format";

export interface ChecklistItem {
  id: string;
  label: string;
  /** Short qualifier shown after the label, e.g. why it's on the list. */
  note?: string;
}
export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export function buildChecklist(camp: Camp): ChecklistSection[] {
  const feat = expandFeatures(camp.features); // codes + their broader ancestors
  const has = (code: string): boolean => feat.has(code);
  const dayOnly = camp.camp_type === "day_camp";
  const water = has("aquatics") || has("waterfront") || has("pool");
  const trail = has("high_adventure_option") || has("backpacking");
  const coldNights =
    (camp.july_low_f != null && camp.july_low_f <= 50) ||
    (camp.elevation_ft != null && camp.elevation_ft >= 6000);
  const hotDays = camp.july_high_f != null && camp.july_high_f >= 90;

  const sections: ChecklistSection[] = [];

  const clothing: ChecklistItem[] = [
    { id: "field-uniform", label: "Field uniform (Class A)", note: "for opening, closing, and dinner" },
    { id: "activity-clothes", label: "Activity clothes for each day (Class B)" },
    { id: "shorts-pants", label: "Shorts and at least one pair of long pants" },
    { id: "socks-underwear", label: "Socks and underwear, one set per day plus spares" },
    { id: "closed-shoes", label: "Sturdy closed-toe shoes" },
    { id: "rain-gear", label: "Rain jacket or poncho" },
    { id: "hat", label: "Hat or cap" },
  ];
  if (coldNights)
    clothing.push(
      { id: "warm-layer", label: "Warm layers (fleece or jacket)", note: "cool nights here" },
      { id: "beanie", label: "Warm hat or beanie" },
    );
  sections.push({ title: "Clothing", items: clothing });

  if (!dayOnly) {
    const bedding: ChecklistItem[] = [
      { id: "sleeping-bag", label: "Sleeping bag" },
      { id: "sleeping-pad", label: "Sleeping pad or air mattress" },
      { id: "pillow", label: "Pillow" },
    ];
    if (coldNights) bedding.push({ id: "extra-blanket", label: "Extra blanket" });
    if (!has("platform_tents") && !has("cabins"))
      bedding.push({ id: "tent-check", label: "Confirm whether you need to bring a tent", note: "ask the camp" });
    sections.push({ title: "Bedding & shelter", items: bedding });
  }

  const toiletries: ChecklistItem[] = [
    { id: "toothbrush", label: "Toothbrush and toothpaste" },
    { id: "soap-shampoo", label: "Soap and shampoo" },
    { id: "towel", label: dayOnly ? "Small towel" : "Towel for showers" },
    { id: "sunscreen", label: "Sunscreen" },
    { id: "bug-spray", label: "Insect repellent" },
  ];
  if (hotDays) toiletries.push({ id: "electrolytes", label: "Electrolyte mix or tablets", note: "hot afternoons here" });
  sections.push({ title: "Toiletries & sun/bug", items: toiletries });

  const gear: ChecklistItem[] = [
    { id: "water-bottle", label: "Reusable water bottle" },
    { id: "flashlight", label: "Flashlight or headlamp with spare batteries" },
    { id: "daypack", label: "Small daypack" },
  ];
  if (water)
    gear.push(
      { id: "swimsuit", label: "Swimsuit" },
      { id: "swim-towel", label: "Towel for swimming" },
      { id: "water-shoes", label: "Water shoes or old sneakers" },
    );
  if (has("scuba")) gear.push({ id: "scuba-cert", label: "SCUBA certification card", note: "if you hold one" });
  if (trail)
    gear.push(
      { id: "hiking-boots", label: "Broken-in hiking boots" },
      { id: "trail-pack", label: "Daypack or backpack for the trail" },
    );
  if (has("climbing") || has("cope") || has("zip_line"))
    gear.push({ id: "athletic-clothes", label: "Athletic clothes you can move in" });
  if (has("mountain_biking")) gear.push({ id: "riding-gloves", label: "Riding gloves", note: "helmets are provided" });
  if (has("horseback"))
    gear.push({ id: "riding-attire", label: "Long pants and boots with a heel", note: "for horseback" });
  if (has("fishing")) gear.push({ id: "fishing-license", label: "Fishing license", note: "if required for your age" });
  sections.push({ title: "Gear", items: gear });

  sections.push({
    title: "Nice to have",
    items: [
      { id: "camp-chair", label: "Camp chair" },
      { id: "notebook", label: "Notebook and pen" },
      { id: "games", label: "Book, cards, or a small game" },
      { id: "spending-money", label: "Spending money for the trading post" },
      { id: "laundry-bag", label: "Bag for dirty or wet clothes" },
    ],
  });

  sections.push({
    title: "Documents & health",
    items: [
      {
        id: "health-form",
        label: "BSA Annual Health & Medical Record",
        note: "signed; Parts A & B, plus C for long-term camp",
      },
      { id: "medications", label: "Medications in their original containers" },
      { id: "insurance", label: "Copy of your insurance card" },
      { id: "emergency-contacts", label: "Emergency contact information" },
    ],
  });

  return sections;
}
