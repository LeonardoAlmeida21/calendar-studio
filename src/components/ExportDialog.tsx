import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Image,
  FileText,
  Check,
  LoaderCircle,
} from "lucide-react";
import type { CalendarProject } from "../lib/model";
import { monthsBetween, monthCount, addMonths, monthLabel } from "../lib/dates";
import { CalendarDocument } from "./CalendarDocument";
import { captureImage, exportImages, exportPdf } from "../lib/export";
import type { ExportFormat } from "../lib/export";
export function ExportDialog({
  project,
  onClose,
}: {
  project: CalendarProject;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("jpg");
  const [mode, setMode] = useState("all");
  const [start, setStart] = useState(project.settings.startMonth);
  const [end, setEnd] = useState(project.settings.endMonth);
  const [scale, setScale] = useState(2);
  const [paper, setPaper] = useState<"a4" | "a3">("a3");
  const [orientation, setOrientation] = useState(project.settings.orientation);
  const [title, setTitle] = useState(true);
  const [legend, setLegend] = useState(true);
  const [footer, setFooter] = useState(true);
  const [columns, setColumns] = useState(project.settings.columns);
  const [pages, setPages] = useState<string[][]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [preview, setPreview] = useState("");
  const [previewPage, setPreviewPage] = useState(0);
  useEffect(() => setPreviewPage(0), [pages]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const probe = useRef<HTMLDivElement>(null);
  const pageNodes = useRef<(HTMLDivElement | null)[]>([]);
  const selected = monthsBetween(start, end);
  const selectionKey = selected.join(",");
  const paperDimensions = paper === "a4" ? [210, 297] : [297, 420];
  const paperWidth =
    orientation === "landscape" ? paperDimensions[1] : paperDimensions[0];
  const paperHeight =
    orientation === "landscape" ? paperDimensions[0] : paperDimensions[1];
  const designWidth =
    format === "pdf"
      ? Math.floor(((paperWidth - 20) * 96) / 25.4)
      : orientation === "landscape"
        ? 1440
        : 1080;
  useEffect(() => {
    setColumns(project.settings.columns);
  }, [
    paper,
    orientation,
    project.settings.columns,
    format,
    selectionKey,
    title,
    legend,
    footer,
  ]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [busy, onClose]);
  useLayoutEffect(() => {
    let cancelled = false;
    setError("");
    setPreview("");
    if (selected.length === 0 || selected.length > 240) {
      setPages([]);
      setError(
        "Escolhe um intervalo válido com até 240 meses por exportação. Podes exportar intervalos maiores em partes.",
      );
      return;
    }
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        if (cancelled || !probe.current) return;
        if (format !== "pdf") {
          setPages([selected]);
          return;
        }
        const root = probe.current;
        const grid = root.querySelector(".months-grid") as HTMLElement;
        const panels = Array.from(
          root.querySelectorAll<HTMLElement>(".month-panel"),
        );
        const overhead = root.scrollHeight - grid.offsetHeight;
        const available = ((paperHeight - 20) * 96) / 25.4;
        const rows: { months: string[]; height: number }[] = [];
        for (let index = 0; index < selected.length; index += columns) {
          const rowPanels = panels.slice(index, index + columns);
          rows.push({
            months: selected.slice(index, index + columns),
            height: Math.max(...rowPanels.map((panel) => panel.offsetHeight)),
          });
        }
        if (rows.some((row) => row.height + overhead > available)) {
          if (columns > 1) {
            setColumns(columns - 1);
            return;
          }
          setPages([]);
          setError(
            "Um mês está demasiado denso para este papel. Usa A3, outra orientação, ou ajusta o texto das tarefas.",
          );
          return;
        }
        const result: string[][] = [];
        let current: string[] = [];
        let height = overhead;
        for (const row of rows) {
          const extra = row.height + (current.length ? 14 : 0);
          if (current.length && height + extra > available) {
            result.push(current);
            current = [];
            height = overhead;
          }
          height += row.height + (current.length ? 14 : 0);
          current.push(...row.months);
        }
        if (current.length) result.push(current);
        setPages(result);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [
    project,
    selectionKey,
    format,
    paperHeight,
    columns,
    title,
    legend,
    footer,
    designWidth,
  ]);
  useEffect(() => {
    let cancelled = false;
    let url = "";
    const timer = setTimeout(async () => {
      const node = pageNodes.current[previewPage];
      if (!node || !pages.length) return;
      setDimensions({ width: node.scrollWidth, height: node.scrollHeight });
      try {
        const blob = await captureImage(node, 0.4, "image/png");
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          setPreview(url);
        }
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível criar a pré-visualização.",
          );
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [pages, designWidth, title, legend, footer, columns, previewPage]);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".export-dialog");
    const previous = document.activeElement as HTMLElement | null;
    root?.querySelector<HTMLButtonElement>("button")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
        ),
      ).filter((item) => item.offsetParent !== null);
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const doExport = async () => {
    if (!pages.length) return;
    setBusy(true);
    setError("");
    setProgress("A preparar o calendário…");
    try {
      const name = `${project.name}_${start}_${end}`;
      const nodes = pageNodes.current.filter((node): node is HTMLDivElement =>
        Boolean(node),
      );
      if (format === "pdf")
        await exportPdf(nodes, paper, orientation, name, setProgress);
      else await exportImages(nodes[0], format, scale, name);
      setProgress("Descarregamento iniciado.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível exportar.",
      );
    } finally {
      setBusy(false);
    }
  };
  const setSelectionMode = (value: string) => {
    setMode(value);
    if (value === "all") {
      setStart(project.settings.startMonth);
      setEnd(project.settings.endMonth);
    }
    if (value === "single") setEnd(start);
  };
  return (
    <div className="modal-backdrop">
      <section
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Descarregar calendário"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">PRONTO PARA PARTILHAR</span>
            <h2>Leva os teus planos contigo</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar exportação"
          >
            <X size={21} />
          </button>
        </div>
        <div className="export-body">
          <div className="export-controls">
            <span className="field-label">Formato</span>
            <div className="format-options">
              {(["jpg", "png", "pdf"] as const).map((value) => (
                <button
                  className={format === value ? "active" : ""}
                  key={value}
                  onClick={() => setFormat(value)}
                >
                  {value === "pdf" ? (
                    <FileText size={19} />
                  ) : (
                    <Image size={19} />
                  )}
                  <strong>{value.toUpperCase()}</strong>
                  <span>
                    {value === "jpg"
                      ? "Mais leve"
                      : value === "png"
                        ? "Sem perdas"
                        : "Impressão"}
                  </span>
                  {format === value && (
                    <Check size={13} className="format-check" />
                  )}
                </button>
              ))}
            </div>
            <label className="field-label">
              Que meses queres descarregar?
              <select
                aria-label="Meses a descarregar"
                value={mode}
                onChange={(e) => setSelectionMode(e.target.value)}
              >
                <option value="all">Todos os meses apresentados</option>
                <option value="range">Escolher um intervalo</option>
                <option value="single">Apenas um mês</option>
              </select>
            </label>
            <div className="two-fields">
              <label className="field-label">
                Começar em
                <input
                  aria-label="Primeiro mês da exportação"
                  type="month"
                  value={start}
                  min={project.settings.startMonth}
                  max={project.settings.endMonth}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value < project.settings.startMonth ||
                      value > project.settings.endMonth
                    )
                      return;
                    setMode(mode === "single" ? "single" : "range");
                    setStart(value);
                    if (mode === "single" || value > end) setEnd(value);
                  }}
                />
              </label>
              <label className="field-label">
                Quantos meses?
                <input
                  aria-label="Número de meses a exportar"
                  type="number"
                  min={1}
                  max={monthCount(start, project.settings.endMonth)}
                  value={monthCount(start, end)}
                  disabled={mode === "single"}
                  onChange={(e) => {
                    const count = e.target.valueAsNumber;
                    if (
                      count >= 1 &&
                      count <= monthCount(start, project.settings.endMonth)
                    ) {
                      setMode("range");
                      setEnd(addMonths(start, count - 1));
                    }
                  }}
                />
              </label>
            </div>
            <div className="export-range">
              <span className="local-dot" />
              <span>
                {selected.length} {selected.length === 1 ? "mês" : "meses"} ·{" "}
                {monthLabel(start, "pt-PT")}
                {start !== end ? ` — ${monthLabel(end, "pt-PT")}` : ""}
              </span>
            </div>
            {format !== "pdf" ? (
              <>
                <label className="field-label">
                  Resolução
                  <div className="segmented-control">
                    {[2, 4].map((value) => (
                      <button
                        key={value}
                        className={scale === value ? "active" : ""}
                        onClick={() => setScale(value)}
                      >
                        {value}× {value === 2 ? "Alta" : "Muito alta"}
                      </button>
                    ))}
                  </div>
                </label>
                <p className="help-text">
                  {dimensions.width * scale} × {dimensions.height * scale}{" "}
                  píxeis{format === "jpg" ? " · Qualidade 95%" : ""}
                </p>
              </>
            ) : (
              <div className="two-fields">
                <label className="field-label">
                  Papel
                  <select
                    value={paper}
                    onChange={(e) => setPaper(e.target.value as "a4" | "a3")}
                  >
                    <option value="a3">A3</option>
                    <option value="a4">A4</option>
                  </select>
                </label>
                <label className="field-label">
                  Orientação
                  <select
                    value={orientation}
                    onChange={(e) =>
                      setOrientation(e.target.value as "landscape" | "portrait")
                    }
                  >
                    <option value="landscape">Horizontal</option>
                    <option value="portrait">Vertical</option>
                  </select>
                </label>
              </div>
            )}
            <div className="export-includes">
              <span className="field-label">Incluir na imagem</span>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={title}
                  onChange={(e) => setTitle(e.target.checked)}
                />
                Título e subtítulo
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={legend}
                  onChange={(e) => setLegend(e.target.checked)}
                />
                Legenda de cores
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={footer}
                  onChange={(e) => setFooter(e.target.checked)}
                />
                Rodapé
              </label>
            </div>
          </div>
          <div className="export-preview-area">
            <div className="preview-label">
              <span>PRÉ-VISUALIZAÇÃO</span>
              <span>
                {format === "pdf"
                  ? `${pages.length} ${pages.length === 1 ? "página" : "páginas"}`
                  : "Só os meses escolhidos"}
              </span>
            </div>
            <div className="export-preview-paper">
              {preview ? (
                <img
                  src={preview}
                  alt="Pré-visualização do calendário a descarregar"
                />
              ) : (
                <div className="preview-loading">
                  <LoaderCircle className="spin" size={24} />
                  <span>A preparar pré-visualização…</span>
                </div>
              )}
            </div>
            <p className="quiet-note">
              {format === "pdf"
                ? `Meses inteiros · ${columns} ${columns === 1 ? "coluna" : "colunas"} · Texto em imagem`
                : "O ficheiro inclui apenas o calendário, sem botões nem ferramentas."}
            </p>
            {format === "pdf" && pages.length > 1 && (
              <div className="page-list">
                {pages.map((page, index) => (
                  <button
                    key={index}
                    className={previewPage === index ? "active" : ""}
                    onClick={() => {
                      setPreview("");
                      setPreviewPage(index);
                    }}
                    aria-label={`Ver página ${index + 1}`}
                  >
                    Página {index + 1}:{" "}
                    {page.map((month) => monthLabel(month, "pt-PT")).join(", ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="export-actions">
          <div aria-live="polite">
            {error ? (
              <p className="error-text">{error}</p>
            ) : (
              <p className="quiet-note">
                {progress ||
                  "Os teus calendários continuam editáveis depois de descarregar."}
              </p>
            )}
          </div>
          <button
            className="primary-button"
            disabled={busy || !pages.length || Boolean(error)}
            onClick={doExport}
          >
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Download size={17} />
            )}{" "}
            {busy ? "A gerar…" : `Descarregar ${format.toUpperCase()}`}
          </button>
        </div>
      </section>
      <div className="export-staging" aria-hidden="true">
        <div style={{ width: designWidth }}>
          <CalendarDocument
            ref={probe}
            project={project}
            months={selected.slice(0, 240)}
            columns={columns}
            showTitle={title}
            showLegend={legend}
            showFooter={footer}
          />
        </div>
        {pages.map((months, index) => (
          <div
            style={{ width: designWidth }}
            key={`${index}-${months.join(",")}`}
          >
            <CalendarDocument
              ref={(node) => {
                pageNodes.current[index] = node;
              }}
              project={project}
              months={months}
              columns={columns}
              showTitle={title}
              showLegend={legend}
              showFooter={footer}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
