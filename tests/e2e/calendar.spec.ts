import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
const documentSelector = ".canvas-transform .calendar-document";
async function ready(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "Nome do calendário" }),
  ).toHaveValue("Experimental Timeline 2026–2027");
  await page.evaluate(() => document.fonts.ready);
}
test("seeded tasks, accurate dates, changing displayed months and no clipping", async ({
  page,
}) => {
  await ready(page);
  expect(await page.locator(`${documentSelector} .month-panel`).count()).toBe(
    4,
  );
  await expect(
    page.getByRole("button", { name: "Thaw cells, 2026-10-28", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("spinbutton", { name: "Número de meses", exact: true })
    .fill("6");
  await expect(page.locator(`${documentSelector} .month-panel`)).toHaveCount(6);
  await page
    .getByRole("spinbutton", { name: "Número de meses", exact: true })
    .fill("4");
  await expect(page.locator(`${documentSelector} .month-panel`)).toHaveCount(4);
  const overflow = await page
    .locator(`${documentSelector} .week-row`)
    .evaluateAll(
      (rows) =>
        rows.filter((row) => {
          const grid = row.querySelector(".events-grid")!;
          return (
            grid.getBoundingClientRect().height >
            row.getBoundingClientRect().height + 1
          );
        }).length,
    );
  expect(overflow).toBe(0);
  await page.screenshot({ path: "work/editor-desktop.png", fullPage: true });
});
test("direct editing, recent colors, persistence, move/copy and undo", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", {
      name: "Adicionar tarefa em 2026-10-06",
      exact: true,
    })
    .click();
  const editor = page.getByRole("dialog", { name: "Editar tarefa" });
  await editor
    .getByRole("textbox", { name: "Descrição da tarefa" })
    .fill("Microscopy\nSecond line");
  await editor
    .getByRole("button", { name: "Cor da tarefa #e9d7ff", exact: true })
    .click();
  await editor.getByRole("button", { name: "Concluído", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Guardado neste navegador" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Microscopy Second line, 2026-10-06",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Microscopy Second line, 2026-10-06",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Cor recente #e9d7ff", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page
    .getByRole("textbox", { name: "Data de destino" })
    .fill("2026-10-08")
    .catch(async () => page.getByLabel("Data de destino").fill("2026-10-08"));
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Microscopy Second line, 2026-10-08",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Microscopy Second line, 2026-10-08",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("exports selected months as JPG, 4x PNG, and printable PDF", async ({
  page,
}) => {
  test.setTimeout(120000);
  await ready(page);
  await page
    .getByRole("spinbutton", { name: "Número de meses", exact: true })
    .fill("6");
  await page.getByRole("button", { name: "Descarregar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Descarregar calendário" });
  await dialog.getByLabel("Meses a descarregar").selectOption("range");
  await dialog.getByLabel("Primeiro mês da exportação").fill("2026-11");
  await dialog
    .getByRole("spinbutton", { name: "Número de meses a exportar" })
    .fill("3");
  await expect(dialog.locator("img")).toBeVisible();
  const stages = page.locator(".export-staging>div").last();
  await expect(stages.locator(".month-panel")).toHaveCount(3);
  expect(
    await stages
      .locator(".month-panel")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-month")),
      ),
  ).toEqual(["2026-11", "2026-12", "2027-01"]);
  let downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descarregar JPG" }).click();
  let download = await downloadPromise;
  await download.saveAs("work/selected-three-months.jpg");
  const jpg = await fs.readFile("work/selected-three-months.jpg");
  expect(jpg[0]).toBe(255);
  expect(jpg[1]).toBe(216);
  await dialog.getByRole("button", { name: "PNG", exact: false }).click();
  await dialog
    .getByRole("button", { name: "4× Muito alta", exact: true })
    .click();
  await expect(dialog.locator("img")).toBeVisible();
  downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descarregar PNG" }).click();
  download = await downloadPromise;
  await download.saveAs("work/selected-three-months.png");
  const png = await fs.readFile("work/selected-three-months.png");
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(5760);
  await dialog.getByRole("button", { name: "PDF", exact: false }).click();
  await expect(
    dialog.getByRole("button", { name: "Descarregar PDF" }),
  ).toBeEnabled();
  await expect(dialog.locator("img")).toBeVisible();
  downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descarregar PDF" }).click();
  download = await downloadPromise;
  await download.saveAs("work/selected-three-months.pdf");
  const pdf = await fs.readFile("work/selected-three-months.pdf");
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  const box = pdf
    .toString("latin1")
    .match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  expect(box).not.toBeNull();
  expect(Number(box![1])).toBeCloseTo(1190.55, 1);
  expect(Number(box![2])).toBeCloseTo(841.89, 1);
  await page.screenshot({ path: "work/export-preview.png", fullPage: true });
});
test("project duplication, deletion and JSON roundtrip preserve originals", async ({
  page,
}) => {
  await ready(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Projeto", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs("work/project-backup.json");
  const backup = JSON.parse(
    await fs.readFile("work/project-backup.json", "utf8"),
  );
  expect(backup.projects[0].events).toHaveLength(39);
  await page
    .getByRole("button", { name: "Os meus calendários", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Duplicar Experimental Timeline 2026–2027",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nome do calendário" }),
  ).toHaveValue("Experimental Timeline 2026–2027 — cópia");
  await page
    .getByRole("button", { name: "Os meus calendários", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await page
    .getByRole("button", {
      name: "Eliminar Experimental Timeline 2026–2027 — cópia",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Eliminar calendário", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page
    .locator("input[type=file]")
    .setInputFiles("work/project-backup.json");
  await expect(
    page.getByRole("textbox", { name: "Nome do calendário" }),
  ).toHaveValue("Experimental Timeline 2026–2027");
  await page
    .getByRole("button", { name: "Os meus calendários", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await page.screenshot({ path: "work/library-desktop.png", fullPage: true });
});
test("mobile editor remains usable without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Descarregar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir definições" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Número de meses", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("spinbutton", { name: "Número de meses", exact: true })
    .fill("2");
  await page.getByRole("button", { name: "Fechar definições" }).click();
  await expect(page.locator(`${documentSelector} .month-panel`)).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Thaw cells, 2026-10-28", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Descrição da tarefa" })
    .fill("Mobile edit");
  await page.getByRole("button", { name: "Concluído", exact: true }).click();
  await page.screenshot({ path: "work/editor-mobile.png", fullPage: true });
});

test("conflicting tabs preserve both edits through save-as-copy", async ({
  page,
  context,
}) => {
  await ready(page);
  const second = await context.newPage();
  await second.goto(page.url());
  await expect(
    second.getByRole("textbox", { name: "Nome do calendário" }),
  ).toHaveValue("Experimental Timeline 2026–2027");
  await page
    .getByRole("button", { name: "Thaw cells, 2026-10-28", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Descrição da tarefa" })
    .fill("First tab");
  await page.getByRole("button", { name: "Concluído", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Guardado neste navegador" }),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Thaw cells, 2026-10-28", exact: true })
    .click();
  await second
    .getByRole("textbox", { name: "Descrição da tarefa" })
    .fill("Second tab");
  await second.getByRole("button", { name: "Concluído", exact: true }).click();
  await expect(second.locator(".save-error-banner")).toBeVisible();
  await second
    .getByRole("button", { name: "Guardar cópia", exact: true })
    .click();
  await expect(
    second.getByRole("textbox", { name: "Nome do calendário" }),
  ).toHaveValue("Experimental Timeline 2026–2027 — cópia");
  await expect(
    second.getByRole("button", { name: "Second tab, 2026-10-28", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "First tab, 2026-10-28", exact: true }),
  ).toBeVisible();
});
