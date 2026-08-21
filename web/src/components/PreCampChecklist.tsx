import { useEffect, useMemo, useState } from "react";
import { Heading } from "@opensourcescouting/design-system";
import type { ChecklistSection } from "@lib/checklist";

// Interactive pre-camp checklist. The list itself is server-rendered (works and prints with JS
// off); this island adds check-off state persisted per camp in localStorage, a progress count,
// reset, and print. Check state stays on the device — the page URL is the shareable part.
export default function PreCampChecklist({
  sections,
  campId,
  campName,
  campUrl,
}: {
  sections: ChecklistSection[];
  campId: string;
  campName: string;
  campUrl: string;
}) {
  const lsKey = `camp-finder:checklist:${campId}`;
  const allIds = useMemo(() => sections.flatMap((s) => s.items.map((i) => i.id)), [sections]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Load persisted checks after mount, so first paint matches the SSR (all-unchecked) HTML and
  // there is no hydration mismatch. Drop any saved ids no longer in the list.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(lsKey);
      if (raw) {
        const valid = new Set(allIds);
        setChecked(new Set((JSON.parse(raw) as string[]).filter((id) => valid.has(id))));
      }
    } catch {
      /* ignore unavailable or malformed storage */
    }
    setHydrated(true);
  }, [lsKey, allIds]);

  // Persist after the initial load only, so the empty pre-hydration state never clobbers storage.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(lsKey, JSON.stringify([...checked]));
    } catch {
      /* ignore */
    }
  }, [checked, hydrated, lsKey]);

  const done = useMemo(() => allIds.filter((id) => checked.has(id)).length, [allIds, checked]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {done} of {allIds.length} packed
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChecked(new Set())}
            className="cf-tap rounded-lg border border-border px-3 text-sm text-foreground hover:border-primary"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="cf-tap rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Print
          </button>
        </div>
      </div>

      <div className="mt-5 columns-1 gap-8 md:columns-2">
        {sections.map((section) => (
          <section key={section.title} className="mb-6 break-inside-avoid">
            <Heading level={2} size={4}>
              {section.title}
            </Heading>
            <ul className="mt-2 flex flex-col gap-1.5">
              {section.items.map((item) => {
                const isChecked = checked.has(item.id);
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setChecked((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          })
                        }
                        className="mt-1 size-4 shrink-0"
                        style={{ accentColor: "rgb(var(--primary))" }}
                      />
                      <span className={isChecked ? "text-muted-foreground line-through" : "text-foreground"}>
                        {item.label}
                        {item.note && <span className="text-muted-foreground"> — {item.note}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
        A starting point, not the official list. Always confirm what to bring on{" "}
        <a href={campUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/90">
          {campName}'s own page
        </a>
        .
      </p>
    </div>
  );
}
