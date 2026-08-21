import { Heading } from "@opensourcescouting/design-system";
import type { ChecklistSection } from "@lib/checklist";

// Presentational: one titled checklist (e.g. the planning timeline, or the packing list) with a
// progress count and reset. Check state is owned by the parent (CampPlanner) so it can persist
// per camp; this component just renders and reports toggles.
export default function ChecklistGroup({
  title,
  intro,
  sections,
  checked,
  onToggle,
  onReset,
}: {
  title: string;
  intro?: string;
  sections: ChecklistSection[];
  checked: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  const allIds = sections.flatMap((s) => s.items.map((i) => i.id));
  const done = allIds.filter((id) => checked.has(id)).length;

  return (
    <section className="mt-10 first:mt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
        <Heading level={2} size={3}>
          {title}
        </Heading>
        <div className="flex items-center gap-3 print:hidden">
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {done} of {allIds.length}
          </span>
          <button
            type="button"
            onClick={onReset}
            className="cf-tap rounded-lg border border-border px-3 text-sm text-foreground hover:border-primary"
          >
            Reset
          </button>
        </div>
      </div>
      {intro && <p className="mt-2 text-sm text-muted-foreground">{intro}</p>}

      <div className="mt-4 columns-1 gap-8 md:columns-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-6 break-inside-avoid">
            <h3 className="display text-base text-foreground">{section.title}</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {section.items.map((item) => {
                const isChecked = checked.has(item.id);
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggle(item.id)}
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
          </div>
        ))}
      </div>
    </section>
  );
}
