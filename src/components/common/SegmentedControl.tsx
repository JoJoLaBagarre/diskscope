/** Generic segmented control (reuses the existing `.seg`/`.seg-btn` styles). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.id}
          className={`seg-btn${value === o.id ? " active" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
