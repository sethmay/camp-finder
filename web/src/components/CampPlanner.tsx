import { useEffect, useMemo, useState } from "react";
import type { Camp } from "@lib/types";
import { withBase } from "@lib/paths";
import { buildChecklist, buildTimeline, type ChecklistSection } from "@lib/checklist";
import ChecklistGroup from "./ChecklistGroup";

// Central, returnable camp-planning tool. Mirrors CompareApp's static pattern: the subject camp
// comes from `?camp=<id>` (or the last-active plan in localStorage), the camp list is fetched at
// runtime, and check-off state persists per camp + group in localStorage. Two groups: the
// organizer planning timeline, and a packing list to hand to families.
const ACTIVE_KEY = "camp-finder:plan:active";

interface Group {
  key: string;
  title: string;
  intro: string;
  sections: ChecklistSection[];
}

export default function CampPlanner() {
  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, Set<string>>>({});

  // On mount: resolve the active camp from the URL or storage, and load the camp list.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("camp");
    setActiveId(param || window.localStorage.getItem(ACTIVE_KEY) || null);
    fetch(withBase("/data/camps.json"))
      .then((r) => r.json())
      .then((data: Camp[]) => setCamps(data))
      .catch(() => setCamps([]));
  }, []);

  const camp = useMemo(
    () => (camps && activeId ? (camps.find((c) => c.id === activeId) ?? null) : null),
    [camps, activeId],
  );

  const groups = useMemo<Group[]>(() => {
    if (!camp) return [];
    return [
      { key: "timeline", title: "Planning timeline", intro: "Your camp-planning to-dos, roughly in order.", sections: buildTimeline(camp) },
      { key: "packing", title: "Packing list", intro: "A starting point to share with your Scouts and families.", sections: buildChecklist(camp) },
    ];
  }, [camp]);

  // When the active camp resolves: remember it and reflect it in the URL (shareable), then load
  // the plan's check state. State is keyed to the PLAN, not the camp, so changing the camp keeps
  // your progress — each camp just renders the items that apply to it (see toggle/reset).
  useEffect(() => {
    if (!camp) return;
    window.localStorage.setItem(ACTIVE_KEY, camp.id);
    const params = new URLSearchParams(window.location.search);
    if (params.get("camp") !== camp.id) {
      params.set("camp", camp.id);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }
    const loaded: Record<string, Set<string>> = {};
    for (const g of groups) {
      try {
        const raw = window.localStorage.getItem(`camp-finder:plan:${g.key}`);
        loaded[g.key] = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
      } catch {
        loaded[g.key] = new Set();
      }
    }
    setChecked(loaded);
  }, [camp, groups]);

  const toggle = (groupKey: string, id: string) => {
    if (!camp) return;
    setChecked((prev) => {
      const set = new Set(prev[groupKey] ?? []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      window.localStorage.setItem(`camp-finder:plan:${groupKey}`, JSON.stringify([...set]));
      return { ...prev, [groupKey]: set };
    });
  };

  const reset = (groupKey: string) => {
    if (!camp) return;
    window.localStorage.removeItem(`camp-finder:plan:${groupKey}`);
    setChecked((prev) => ({ ...prev, [groupKey]: new Set() }));
  };

  if (camps === null) return <p className="text-muted-foreground">Loading…</p>;

  if (!camp) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-foreground">Start by choosing the camp you're planning for.</p>
        <a href={withBase("/")} className="mt-3 inline-block text-primary hover:text-primary/90">
          Find a camp →
        </a>
        {activeId && (
          <p className="mt-2 text-sm text-muted-foreground">We couldn't find a camp matching "{activeId}".</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 print:hidden">
        <p className="text-base text-foreground">
          Planning for <span className="display">{camp.name}</span> ·{" "}
          <a href={withBase("/")} className="text-primary hover:text-primary/90">
            change
          </a>
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="cf-tap rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Print
        </button>
      </div>

      {groups.map((g) => (
        <ChecklistGroup
          key={g.key}
          title={g.title}
          intro={g.intro}
          sections={g.sections}
          checked={checked[g.key] ?? new Set()}
          onToggle={(id) => toggle(g.key, id)}
          onReset={() => reset(g.key)}
        />
      ))}

      <p className="mt-10 border-t border-border pt-4 text-sm text-muted-foreground">
        A starting point, not the official process. Confirm deadlines, fees, forms, and camperships on{" "}
        <a href={camp.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/90">
          {camp.council_name ?? camp.name}'s page
        </a>
        .
      </p>
    </div>
  );
}
