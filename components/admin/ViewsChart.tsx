type Props = { data: Array<{ day: string; views: number }> };

export function ViewsChart({ data }: Props) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-charcoal/50">
        No views recorded in this period yet.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.views));

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-end gap-1" style={{ height: 180 }}>
        {data.map((d) => (
          <div key={d.day} className="group relative flex flex-col items-center">
            <div
              className="w-3 rounded-t bg-gradient-to-t from-grad-from to-grad-to transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max((d.views / max) * 160, 2)}px` }}
            />
            <span className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {d.views} on {d.day}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-charcoal/50">
        <span>{data[0].day}</span>
        <span>{data[data.length - 1].day}</span>
      </div>
    </div>
  );
}
