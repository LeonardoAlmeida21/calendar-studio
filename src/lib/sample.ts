import type { CalendarProject } from "./model";
import { uid } from "./model";
export function blankProject(): CalendarProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: uid(),
    name: "Novo calendário",
    createdAt: now,
    updatedAt: now,
    revision: 0,
    categories: [],
    events: [],
    settings: {
      title: "O meu calendário",
      subtitle: "",
      footer: "",
      startMonth: "2026-10",
      endMonth: "2027-01",
      weekStartsOn: 1,
      columns: 2,
      orientation: "landscape",
      locale: "pt-PT",
      background: "#f6faff",
      headerBackground: "#123965",
      headerForeground: "#ffffff",
      monthBackground: "#e0ebf6",
      monthForeground: "#10365b",
      eventBackground: "#cfe3ff",
      eventForeground: "#123965",
      fontSize: 12,
      eventFontSize: 12,
      weekendHighlight: true,
      legend: "top",
      monthOverrides: {},
    },
  };
}
export function exampleProject(): CalendarProject {
  const project = blankProject();
  project.name = "Experimental Timeline 2026–2027";
  Object.assign(project.settings, {
    title: "CELL CULTURE  |  EXPERIMENTAL CALENDAR",
    subtitle: "28 October 2026 – 25 January 2027  •  Monday–Sunday calendar",
    footer:
      "Study sequence: Pilot (TGF-β optimization) → Collagen type I → Collagen type III → Elastin\nT = pilot time point  •  D = study time point  •  Light weekend shading highlights Saturday and Sunday",
    locale: "en-GB",
  });
  project.categories = [
    {
      id: "preparation",
      name: "Preparation",
      background: "#cfe3ff",
      foreground: "#0052a0",
    },
    {
      id: "pilot",
      name: "Pilot study",
      background: "#ffd8e4",
      foreground: "#b30042",
    },
    {
      id: "collagen1",
      name: "Collagen I",
      background: "#ffedbd",
      foreground: "#594024",
    },
    {
      id: "collagen3",
      name: "Collagen III",
      background: "#d4f8e6",
      foreground: "#004d46",
    },
    {
      id: "elastin",
      name: "Elastin",
      background: "#e9d7ff",
      foreground: "#6100a8",
    },
    {
      id: "final",
      name: "Finalization",
      background: "#dce5eb",
      foreground: "#124267",
    },
    {
      id: "conference",
      name: "Conference",
      background: "#e0e2e5",
      foreground: "#344458",
    },
    {
      id: "holiday",
      name: "Holidays",
      background: "#d4f8e6",
      foreground: "#004d46",
    },
  ];
  const add = (
    date: string,
    text: string,
    categoryId: string,
    end = date,
    display: "span" | "daily" = "span",
  ) =>
    project.events.push({
      id: uid(),
      start: date,
      end,
      text,
      categoryId,
      background: null,
      foreground: null,
      display,
      order: project.events.length,
    });
  add("2026-10-28", "Thaw cells", "preparation");
  add("2026-10-28", "Stock solutions +\nsterilization", "preparation");
  for (const date of [
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-02",
    "2026-11-03",
  ])
    add(date, "Preparation ongoing", "preparation");
  add("2026-11-04", "Finish preparation", "preparation");
  add("2026-11-04", "Seed cells", "pilot");
  add("2026-11-05", "Fix cells (T=1)", "pilot");
  add("2026-11-07", "Fix cells (T=3)", "pilot");
  add("2026-11-09", "Staining + confocal\n(T=1 & T=3)", "pilot");
  add(
    "2026-11-10",
    "Analyze data; select optimal TGF-β concentration",
    "pilot",
  );
  add("2026-11-11", "Cells ready for seeding", "pilot");
  add("2026-11-11", "Cell seeding", "collagen3");
  add("2026-11-12", "Particle treatment", "collagen1");
  add("2026-11-13", "D1 time point", "collagen1");
  add("2026-11-15", "D3 time point", "collagen1");
  add("2026-11-19", "Fix cells (D7)", "collagen3");
  add("2026-11-20", "Staining + confocal\n(D7)", "collagen3");
  add("2026-11-24", "Conference", "conference", "2026-11-27", "daily");
  add("2026-11-30", "Cell seeding", "elastin");
  add("2026-12-01", "Particle treatment", "collagen1");
  add("2026-12-02", "D1 time point", "collagen1");
  add("2026-12-04", "D3 time point", "collagen1");
  add("2026-12-09", "D7 time point", "collagen1");
  add("2026-12-10", "Conference", "conference", "2026-12-11", "daily");
  add("2026-12-14", "Data analysis\n(14–17 Dec)", "collagen1");
  add("2026-12-15", "Data analysis", "collagen1");
  add("2026-12-16", "Data analysis", "collagen1");
  add("2026-12-17", "Christmas\nHolidays", "holiday", "2026-12-29", "daily");
  add("2027-01-04", "Cell seeding", "elastin");
  add("2027-01-05", "Particle treatment", "collagen1");
  add("2027-01-06", "D1 time point", "collagen1");
  add("2027-01-08", "D3 time point", "elastin");
  add("2027-01-12", "D7 time point", "elastin");
  add("2027-01-15", "Fix cells (D7)", "elastin");
  add("2027-01-19", "Staining + confocal\n(D7)", "elastin");
  add("2027-01-25", "All data analyzed;\npresentation completed", "final");
  return project;
}
