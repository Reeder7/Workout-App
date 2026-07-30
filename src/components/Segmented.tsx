interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}

/**
 * iOS-style segmented control. A sliding thumb communicates which option is
 * live; a row of buttons where one is filled reads as four separate actions.
 */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const n = options.length

  return (
    <div
      className="segmented"
      role="radiogroup"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      <span
        className="segmented-thumb"
        aria-hidden="true"
        style={{
          width: `calc((100% - 6px) / ${n})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="segmented-opt"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
