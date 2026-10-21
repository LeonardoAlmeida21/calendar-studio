import { openDB } from "idb";
import type { DBSchema } from "idb";
import { backupSchema, cloneProject, projectSchema } from "./model";
import type { CalendarProject } from "./model";
import { exampleProject } from "./sample";
interface CalendarDB extends DBSchema {
  projects: {
    key: string;
    value: CalendarProject;
    indexes: { updatedAt: string };
  };
  preferences: { key: string; value: unknown };
}
const namespace =
  typeof location === "undefined"
    ? "test"
    : location.pathname.replace(/\/index\.html$/, "/");
const database = () =>
  openDB<CalendarDB>(`calendar-studio:${namespace}`, 1, {
    upgrade(db) {
      const store = db.createObjectStore("projects", { keyPath: "id" });
      store.createIndex("updatedAt", "updatedAt");
      db.createObjectStore("preferences");
    },
  });
export class ConflictError extends Error {
  constructor() {
    super(
      "Este calendário foi alterado noutra aba. Reabre-o ou guarda uma cópia.",
    );
  }
}
export async function initialize() {
  const db = await database();
  const transaction = db.transaction(["projects", "preferences"], "readwrite");
  if (!(await transaction.objectStore("preferences").get("initialized"))) {
    await transaction.objectStore("projects").add(exampleProject());
    await transaction.objectStore("preferences").put(true, "initialized");
  }
  await transaction.done;
}
export async function listProjects() {
  const db = await database();
  return (await db.getAll("projects"))
    .map((value) => projectSchema.parse(value))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function saveProject(
  project: CalendarProject,
  expectedRevision: number | null,
) {
  const db = await database();
  const transaction = db.transaction("projects", "readwrite");
  const existing = await transaction.store.get(project.id);
  if (
    expectedRevision !== null &&
    (existing?.revision ?? 0) !== expectedRevision
  ) {
    transaction.abort();
    await transaction.done.catch(() => {});
    throw new ConflictError();
  }
  const saved = projectSchema.parse({
    ...project,
    revision: (existing?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  });
  await transaction.store.put(saved);
  await transaction.done;
  return saved;
}
export async function deleteProject(id: string) {
  const db = await database();
  await db.delete("projects", id);
}
export async function readRecentColors(): Promise<string[]> {
  const db = await database();
  const value = await db.get("preferences", "recentColors");
  return Array.isArray(value)
    ? value
        .filter(
          (color): color is string =>
            typeof color === "string" && /^#[a-f\d]{6}$/i.test(color),
        )
        .slice(0, 12)
    : [];
}
export async function writeRecentColors(colors: string[]) {
  const db = await database();
  await db.put("preferences", colors.slice(0, 12), "recentColors");
}
export function backupBlob(projects: CalendarProject[]) {
  return new Blob(
    [
      JSON.stringify(
        {
          format: "calendar-studio",
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          projects,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
}
export async function importBackup(file: File) {
  if (file.size > 25 * 1024 * 1024)
    throw new Error(
      "O ficheiro excede 25 MB. Divide o backup em ficheiros menores.",
    );
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("Este ficheiro não contém JSON válido.");
  }
  const result = backupSchema.safeParse(data);
  if (!result.success)
    throw new Error(
      "Formato de projeto inválido ou versão não suportada. Importa um JSON exportado pelo Calendar Studio.",
    );
  const projects = result.data.projects.map(cloneProject);
  const db = await database();
  const transaction = db.transaction("projects", "readwrite");
  for (const project of projects) await transaction.store.add(project);
  await transaction.done;
  return projects;
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function safeFilename(name: string) {
  return (
    name
      .replace(/[^\p{L}\p{N}._ -]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 100) || "calendar"
  );
}
