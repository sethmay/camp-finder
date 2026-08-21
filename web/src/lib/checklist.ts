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

// Organizer's camp-planning playbook: the to-dos a Scoutmaster or committee member works
// through to take a unit to camp — reserve, budget/fundraise, recruit help, stay compliant,
// communicate. Phase-ordered as a rough timeline. Light per-camp tailoring; no real deadlines
// or fees (those link out to the council). Pure + tested.
export function buildTimeline(camp: Camp): ChecklistSection[] {
  const feat = expandFeatures(camp.features);
  const has = (code: string): boolean => feat.has(code);
  const dayOnly = camp.camp_type === "day_camp";
  const water = has("aquatics") || has("waterfront") || has("pool");
  const trail = has("high_adventure_option") || has("backpacking");

  const paperwork: ChecklistItem[] = [
    {
      id: "health-records",
      label: "Collect BSA Annual Health & Medical Records",
      note: dayOnly ? "Parts A & B" : "Parts A & B; Part C (with a physician) for long-term camp",
    },
    { id: "med-forms", label: "Gather medication, allergy, and dietary-need forms" },
    { id: "consent-forms", label: "Collect permission / consent forms" },
    { id: "roster", label: "Prepare the unit roster for the camp" },
    { id: "tour-plan", label: "File a tour or activity plan if your council requires one" },
  ];
  if (water) paperwork.push({ id: "swim-records", label: "Collect swim-classification records", note: "for the waterfront" });

  const program: ChecklistItem[] = [
    { id: "mb-signup", label: "Sign up for merit-badge / program classes", note: "many fill early" },
    { id: "youth-tracks", label: "Plan first-year and older-Scout tracks" },
    {
      id: "transportation",
      label: dayOnly
        ? "Set a daily drop-off & pick-up plan"
        : "Build the transportation plan (vehicles, drivers, times)",
    },
    { id: "gear", label: "Ready troop gear: trailer, patrol boxes, dining fly" },
    { id: "diets-to-camp", label: "Send dietary needs and special requests to the camp" },
  ];
  if (trail)
    program.push({ id: "fitness-shakedown", label: "Confirm fitness requirements and plan a shakedown", note: "high-adventure" });

  return [
    {
      title: "Get started",
      items: [
        { id: "poll-troop", label: "Poll the troop for interest and workable dates" },
        { id: "pick-session", label: "Pick the camp and session" },
        { id: "reserve-site", label: "Reserve your site and pay the deposit" },
        { id: "confirm-capacity", label: "Confirm how many sites or spots you hold" },
      ],
    },
    {
      title: "Budget & fundraising",
      items: [
        { id: "set-price", label: "Set the per-Scout price" },
        { id: "build-budget", label: "Build a budget: site + program fees, food, transportation, gear" },
        { id: "fundraiser", label: "Schedule a fundraiser or two" },
        { id: "camperships", label: "Apply for camperships / financial aid", note: "ask the council" },
        { id: "payment-schedule", label: "Set a payment schedule and deadlines" },
        { id: "track-payments", label: "Track who has paid" },
      ],
    },
    {
      title: "Recruit your team",
      items: [
        { id: "two-deep", label: "Line up adults for two-deep leadership" },
        { id: "ypt", label: "Confirm Youth Protection Training is current for every adult" },
        { id: "drivers", label: "Recruit drivers" },
        { id: "roles", label: "Assign roles: camp Scoutmaster, quartermaster, treasurer" },
        { id: "register-adults", label: "Register your adults with the camp" },
      ],
    },
    { title: "Paperwork & compliance", items: paperwork },
    { title: "Program & logistics", items: program },
    {
      title: "Communicate with families",
      items: [
        { id: "info-night", label: "Hold a parent info night" },
        { id: "share-packing", label: "Distribute the packing list", note: "see below" },
        { id: "share-logistics", label: "Share the camp address and phone, drop-off & pick-up times, and an emergency contact tree" },
        { id: "final-collect", label: "Collect final payments and forms" },
      ],
    },
    {
      title: "The week before",
      items: [
        { id: "shakedown", label: "Run a pre-camp shakedown and packing check" },
        { id: "confirm-headcount", label: "Confirm the headcount and medications" },
        { id: "print-forms", label: "Print rosters and forms to bring" },
        { id: "confirm-departure", label: "Confirm the departure time and meeting spot" },
      ],
    },
    {
      title: "At camp",
      items: [
        { id: "check-in", label: "Check in: medical rechecks and swim checks" },
        { id: "turn-in", label: "Turn in forms and medications at the health lodge" },
        { id: "site-setup", label: "Set up your site" },
        { id: "duty-roster", label: "Post the patrol / PLC duty roster" },
      ],
    },
    {
      title: "After camp",
      items: [
        { id: "thanks", label: "Thank your leaders, drivers, and donors" },
        { id: "reconcile", label: "Reconcile the budget" },
        { id: "advancement", label: "Record advancement (blue cards → Scoutbook)" },
        { id: "return-gear", label: "Return and store troop gear" },
        { id: "rebook", label: "Reserve next year", note: "many camps rebook on-site" },
      ],
    },
  ];
}
