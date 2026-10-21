import { z } from "zod";
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value &&
      value.slice(0, 4) !== "0000"
    );
  }, "Data inválida");
const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine((value) => value.slice(0, 4) !== "0000");
export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  background: colorSchema,
  foreground: colorSchema,
});
export const eventSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().max(10000),
    start: dateSchema,
    end: dateSchema,
    categoryId: z.string().nullable(),
    background: colorSchema.nullable(),
    foreground: colorSchema.nullable(),
    display: z.enum(["span", "daily"]),
    order: z.number().int().nonnegative(),
  })
  .refine(
    (event) => event.start <= event.end,
    "O fim deve ser igual ou posterior ao início",
  );
export const settingsSchema = z
  .object({
    title: z.string().max(300),
    subtitle: z.string().max(1000),
    footer: z.string().max(2000),
    startMonth: monthSchema,
    endMonth: monthSchema,
    weekStartsOn: z.number().int().min(0).max(6),
    columns: z.number().int().min(1).max(4),
    orientation: z.enum(["landscape", "portrait"]),
    locale: z.enum(["en-GB", "pt-PT"]),
    background: colorSchema,
    headerBackground: colorSchema,
    headerForeground: colorSchema,
    monthBackground: colorSchema,
    monthForeground: colorSchema,
    eventBackground: colorSchema,
    eventForeground: colorSchema,
    fontSize: z.number().min(9).max(24),
    eventFontSize: z.number().min(9).max(24),
    weekendHighlight: z.boolean(),
    legend: z.enum(["top", "bottom", "hidden"]),
    monthOverrides: z.record(
      z.string(),
      z.object({ background: colorSchema, foreground: colorSchema }),
    ),
  })
  .refine(
    (settings) => settings.startMonth <= settings.endMonth,
    "Intervalo de meses inválido",
  );
export const projectSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    revision: z.number().int().nonnegative(),
    settings: settingsSchema,
    categories: z.array(categorySchema),
    events: z.array(eventSchema),
  })
  .superRefine((project, ctx) => {
    const categories = new Set(
      project.categories.map((category) => category.id),
    );
    if (
      categories.size !== project.categories.length ||
      new Set(project.events.map((event) => event.id)).size !==
        project.events.length
    )
      ctx.addIssue({ code: "custom", message: "Identificadores repetidos" });
    if (
      project.events.some(
        (event) => event.categoryId && !categories.has(event.categoryId),
      )
    )
      ctx.addIssue({ code: "custom", message: "Categoria inexistente" });
  });
export const backupSchema = z.object({
  format: z.literal("calendar-studio"),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  projects: z.array(projectSchema).min(1).max(1000),
});
export type CalendarProject = z.infer<typeof projectSchema>;
export type CalendarSettings = CalendarProject["settings"];
export type CalendarEvent = CalendarProject["events"][number];
export type Category = CalendarProject["categories"][number];
export const PALETTE = [
  "#cfe3ff",
  "#ffd8e4",
  "#ffedbd",
  "#d4f8e6",
  "#e9d7ff",
  "#dce5eb",
  "#e0e2e5",
  "#f7d7c4",
  "#f6e3f4",
  "#d5f2f2",
  "#f4edc9",
  "#e2e9cb",
];
export const uid = () => crypto.randomUUID();
export function eventColors(project: CalendarProject, event: CalendarEvent) {
  const category = project.categories.find(
    (item) => item.id === event.categoryId,
  );
  return {
    background:
      event.background ??
      category?.background ??
      project.settings.eventBackground,
    foreground:
      event.foreground ??
      category?.foreground ??
      project.settings.eventForeground,
  };
}
export function cloneProject(source: CalendarProject): CalendarProject {
  const project = structuredClone(source);
  const categoryMap = new Map(
    project.categories.map((category) => [category.id, uid()]),
  );
  project.id = uid();
  project.revision = 0;
  project.createdAt = project.updatedAt = new Date().toISOString();
  project.categories = project.categories.map((category) => ({
    ...category,
    id: categoryMap.get(category.id)!,
  }));
  project.events = project.events.map((event) => ({
    ...event,
    id: uid(),
    categoryId: event.categoryId ? categoryMap.get(event.categoryId)! : null,
  }));
  return project;
}
