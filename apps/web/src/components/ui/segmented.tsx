import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

/** Radio-group segmented control (MASTER §8): pill track, 44 px targets, primary fill for the selection. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-11 min-w-14 rounded-full px-3 text-sm font-semibold tabular-nums transition-colors disabled:opacity-45",
            value === o.value ? "bg-primary text-primary-foreground" : "text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
