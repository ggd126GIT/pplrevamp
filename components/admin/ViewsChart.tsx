type Props = { data: Array<{ day: string; views: number }> };

const CHART_HEIGHT = 160;
const MIN_BAR_HEIGHT = 2;
// Bars flex to fill the available width; these bounds keep the 90-day view
// legible (forcing horizontal scroll in the container instead of slivers)
// and stop the 7-day / single-point view from rendering absurdly wide bars.
const MIN_BAR_WIDTH = 10;
const MAX_BAR_WIDTH = 56;

export function ViewsChart({ data }: Props) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-charcoal/50">
        No views recorded in this period yet.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.views));

  // When every day in range has 0 views, `max` is 0 and (views / max) is
  // NaN, which produces an invalid `height: NaNpx` inline style that the
  // browser silently drops. Fall back to the minimum floor height instead.
  const barHeight = (views: number) =>
    max > 0 ? Math.max((views / max) * CHART_HEIGHT, MIN_BAR_HEIGHT) : MIN_BAR_HEIGHT;

  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end justify-center-safe gap-1"
        style={{ height: CHART_HEIGHT }}
      >
        {data.map((d) => (
          <div
            key={d.day}
            className="group relative flex flex-1 flex-col items-center"
            style={{ minWidth: MIN_BAR_WIDTH, maxWidth: MAX_BAR_WIDTH }}
          >
            <div
              className="w-full rounded-t bg-gradient-to-t from-grad-from to-grad-to transition-opacity group-hover:opacity-80"
              style={{ height: `${barHeight(d.views)}px` }}
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
