import type { CalendarEvent } from "./model";
export interface Segment {
  event: CalendarEvent;
  start: number;
  end: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}
export function weekSegments(
  events: CalendarEvent[],
  days: string[],
  month: string,
): { segments: Segment[]; lanes: number } {
  const inside = days
    .map((date, index) => ({ date, index }))
    .filter((item) => item.date.startsWith(month));
  if (!inside.length) return { segments: [], lanes: 0 };
  const first = inside[0].date,
    last = inside[inside.length - 1].date;
  const active = events
    .filter((event) => event.start <= last && event.end >= first)
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        b.end.localeCompare(a.end) ||
        a.order - b.order ||
        a.id.localeCompare(b.id),
    );
  const occupied: boolean[][] = [];
  const segments: Segment[] = [];
  for (const event of active) {
    const from = event.start > first ? event.start : first;
    const to = event.end < last ? event.end : last;
    const start = days.indexOf(from),
      end = days.indexOf(to);
    if (start < 0 || end < 0) continue;
    let lane = 0;
    while (occupied[lane]?.slice(start, end + 1).some(Boolean)) lane++;
    occupied[lane] ??= Array(7).fill(false);
    for (let column = start; column <= end; column++)
      occupied[lane][column] = true;
    if (event.display === "daily") {
      for (let column = start; column <= end; column++)
        segments.push({
          event,
          start: column,
          end: column,
          lane,
          continuesBefore: event.start < days[column],
          continuesAfter: event.end > days[column],
        });
    } else
      segments.push({
        event,
        start,
        end,
        lane,
        continuesBefore: event.start < from,
        continuesAfter: event.end > to,
      });
  }
  return { segments, lanes: occupied.length };
}
