import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonths,
  monthCount,
  monthEnd,
  monthWeeks,
  monthsBetween,
  weekdayLabels,
} from "../src/lib/dates";
import { weekSegments } from "../src/lib/layout";
import { cloneProject, projectSchema } from "../src/lib/model";
import { exampleProject } from "../src/lib/sample";
describe("calendar date arithmetic", () => {
  it("handles leap years and century exceptions", () => {
    expect(monthEnd("1900-02")).toBe("1900-02-28");
    expect(monthEnd("2000-02")).toBe("2000-02-29");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(monthEnd("2100-02")).toBe("2100-02-28");
  });
  it("crosses year boundaries without timezone conversions", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-10", 3)).toBe("2027-01");
    expect(monthsBetween("2026-10", "2027-01")).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    expect(monthCount("2026-10", "2027-03")).toBe(6);
  });
  it("supports years below 100", () => {
    expect(addDays("0001-01-01", 1)).toBe("0001-01-02");
    expect(monthEnd("0004-02")).toBe("0004-02-29");
  });
  it("puts 1 November 2026 on Sunday", () => {
    expect(monthWeeks("2026-11", 1)[0][6]).toBe("2026-11-01");
    expect(weekdayLabels(1)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
  it("renders each date exactly once for all week starts over a Gregorian 400-year cycle", () => {
    for (let year = 2000; year < 2400; year++)
      for (let month = 1; month <= 12; month++) {
        const value = `${year}-${String(month).padStart(2, "0")}`;
        const last = Number(monthEnd(value).slice(-2));
        for (let weekStart = 0; weekStart < 7; weekStart++) {
          const grid = monthWeeks(value, weekStart);
          expect(new Date(`${grid[0][0]}T00:00:00Z`).getUTCDay()).toBe(
            weekStart,
          );
          const inside = grid.flat().filter((day) => day.startsWith(value));
          expect(inside.length).toBe(last);
          expect(new Set(inside).size).toBe(last);
        }
      }
  }, 30000);
});
describe("tasks and reference fixture", () => {
  it("includes all reference tasks and validates the complete project", () => {
    const project = exampleProject();
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(project.events.length).toBe(39);
    expect(
      project.events.filter((event) => event.start === "2026-10-28"),
    ).toHaveLength(2);
    expect(
      project.events.find((event) => event.categoryId === "holiday"),
    ).toMatchObject({
      start: "2026-12-17",
      end: "2026-12-29",
      display: "daily",
    });
    expect(project.events.at(-1)).toMatchObject({
      start: "2027-01-25",
      categoryId: "final",
    });
  });
  it("splits spans across a month boundary and separates overlapping tasks", () => {
    const project = exampleProject();
    const events = [
      {
        ...project.events[0],
        id: "range",
        start: "2026-12-30",
        end: "2027-01-04",
      },
      {
        ...project.events[0],
        id: "other",
        start: "2027-01-01",
        end: "2027-01-02",
      },
    ];
    const dec = weekSegments(events, monthWeeks("2026-12", 1)[4], "2026-12");
    expect(dec.segments[0]).toMatchObject({
      start: 2,
      end: 3,
      continuesAfter: true,
    });
    const jan = weekSegments(events, monthWeeks("2027-01", 1)[0], "2027-01");
    expect(jan.lanes).toBe(2);
    expect(jan.segments[0]).toMatchObject({
      start: 4,
      end: 6,
      continuesBefore: true,
      continuesAfter: true,
    });
  });
  it("creates independent project and category identifiers when duplicated", () => {
    const source = exampleProject(),
      copy = cloneProject(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.events[0].id).not.toBe(source.events[0].id);
    expect(copy.events[0].categoryId).toBe(copy.categories[0].id);
    copy.events[0].text = "Changed";
    expect(source.events[0].text).toBe("Thaw cells");
  });
  it("rejects invalid dates, reversed intervals and dangling categories", () => {
    const source = exampleProject();
    expect(
      projectSchema.safeParse({
        ...source,
        events: [{ ...source.events[0], start: "2026-02-30" }],
      }).success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({
        ...source,
        events: [{ ...source.events[0], end: "2026-01-01" }],
      }).success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({
        ...source,
        events: [{ ...source.events[0], categoryId: "missing" }],
      }).success,
    ).toBe(false);
  });
});
