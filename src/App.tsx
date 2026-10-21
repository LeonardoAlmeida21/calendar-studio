import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Undo2,
  Redo2,
  Download,
  Upload,
  Copy,
  Trash2,
  MoreHorizontal,
  Check,
  LoaderCircle,
  Minus,
  FolderOpen,
  X,
  FileJson,
  ShieldCheck,
  Menu,
  Sparkles,
} from "lucide-react";
import type { CalendarProject } from "./lib/model";
import { cloneProject, uid } from "./lib/model";
import { blankProject, exampleProject } from "./lib/sample";
import { monthCount, monthsBetween } from "./lib/dates";
import {
  backupBlob,
  deleteProject,
  downloadBlob,
  importBackup,
  initialize,
  listProjects,
  readRecentColors,
  safeFilename,
  saveProject,
  writeRecentColors,
} from "./lib/storage";
import { CalendarDocument } from "./components/CalendarDocument";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { EventEditor } from "./components/EventEditor";
import { ExportDialog } from "./components/ExportDialog";
export default function App() {
  const [projects, setProjects] = useState<CalendarProject[]>([]);
  const [project, setProject] = useState<CalendarProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [tab, setTab] = useState<"months" | "appearance" | "colors">("months");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportProject, setExportProject] = useState<CalendarProject | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [zoom, setZoom] = useState<number | null>(null);
  const [availableWidth, setAvailableWidth] = useState(1000);
  const [documentHeight, setDocumentHeight] = useState(1000);
  const [shownMonths, setShownMonths] = useState(24);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [, renderHistory] = useState(0);
  const projectRef = useRef<CalendarProject | null>(null);
  const projectsRef = useRef<CalendarProject[]>([]);
  const dirty = useRef(0);
  const persisted = useRef(0);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const history = useRef<{
    past: CalendarProject[];
    future: CalendarProject[];
    key?: string;
    time: number;
  }>({ past: [], future: [], time: 0 });
  const viewport = useRef<HTMLDivElement>(null);
  const documentNode = useRef<HTMLDivElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);
  const install = useCallback((value: CalendarProject | null) => {
    projectRef.current = value;
    setProject(value);
    revision.current = value?.revision ?? 0;
    dirty.current = persisted.current = 0;
    history.current = { past: [], future: [], time: 0 };
    setSelectedId(null);
    setStatus("saved");
    setSaveError("");
    setShownMonths(24);
    setZoom(null);
    setMobileSidebar(false);
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await initialize();
        const [items, colors] = await Promise.all([
          listProjects(),
          readRecentColors(),
        ]);
        if (!active) return;
        setProjects(items);
        projectsRef.current = items;
        setRecent(colors);
        const hashId = location.hash.match(/^#\/calendar\/(.+)$/)?.[1];
        const initial = hashId
          ? items.find((item) => item.id === decodeURIComponent(hashId))
          : location.hash === "#/calendars"
            ? undefined
            : items[0];
        install(initial ?? null);
        if (initial) historyReplace(initial.id);
      } catch (error) {
        if (active)
          setFatal(
            error instanceof Error
              ? error.message
              : "Não foi possível abrir o armazenamento local.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [install]);
  const flush = useCallback(async () => {
    const operation = queue.current.then(async () => {
      const value = projectRef.current;
      const stamp = dirty.current;
      if (!value || stamp <= persisted.current) return;
      setStatus("saving");
      try {
        const saved = await saveProject(
          { ...value, revision: revision.current },
          revision.current,
        );
        if (projectRef.current?.id === value.id) {
          revision.current = saved.revision;
          persisted.current = stamp;
          setStatus(dirty.current === stamp ? "saved" : "saving");
          setSaveError("");
        }
        setProjects((items) => {
          const result = [
            saved,
            ...items.filter((item) => item.id !== saved.id),
          ];
          projectsRef.current = result;
          return result;
        });
      } catch (error) {
        setStatus("error");
        setSaveError(
          error instanceof Error ? error.message : "Não foi possível guardar.",
        );
        throw error;
      }
    });
    queue.current = operation.catch(() => {});
    return operation;
  }, []);
  useEffect(() => {
    if (!project || dirty.current <= persisted.current) return;
    setStatus("saving");
    const timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [project, flush]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty.current > persisted.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") void flush().catch(() => {});
    };
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("beforeunload", handler);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [flush]);
  useEffect(() => {
    const listener = async () => {
      const id = location.hash.match(/^#\/calendar\/(.+)$/)?.[1];
      if (id && decodeURIComponent(id) === projectRef.current?.id) return;
      try {
        await flush();
        install(
          id
            ? (projectsRef.current.find(
                (item) => item.id === decodeURIComponent(id),
              ) ?? null)
            : null,
        );
      } catch {
        if (projectRef.current) historyReplace(projectRef.current.id);
      }
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, [flush, install]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const change = useCallback((value: CalendarProject, key?: string) => {
    const current = projectRef.current;
    if (!current) return;
    const now = Date.now();
    if (
      !key ||
      history.current.key !== key ||
      now - history.current.time > 900
    ) {
      history.current.past.push(structuredClone(current));
      if (history.current.past.length > 100) history.current.past.shift();
    }
    history.current.future = [];
    history.current.key = key;
    history.current.time = now;
    const next = { ...value, updatedAt: new Date().toISOString() };
    projectRef.current = next;
    dirty.current++;
    setProject(next);
    renderHistory((count) => count + 1);
  }, []);
  const undo = useCallback((redo = false) => {
    const current = projectRef.current;
    if (!current) return;
    const from = redo ? history.current.future : history.current.past;
    const to = redo ? history.current.past : history.current.future;
    const next = from.pop();
    if (!next) return;
    to.push(structuredClone(current));
    history.current.key = undefined;
    projectRef.current = next;
    dirty.current++;
    setProject(next);
    setSelectedId(null);
    renderHistory((count) => count + 1);
  }, []);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo(event.shiftKey);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        undo(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flush().catch(() => {});
      }
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [undo, flush]);
  useEffect(() => {
    if (!project || !viewport.current || !documentNode.current) return;
    const outer = viewport.current,
      inner = documentNode.current;
    const observer = new ResizeObserver(() => {
      setAvailableWidth(Math.max(300, outer.clientWidth - 64));
      setDocumentHeight(inner.scrollHeight);
    });
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [project?.id, project?.settings.orientation]);
  const open = async (value: CalendarProject | null) => {
    try {
      await flush();
      install(value);
      location.hash = value
        ? `/calendar/${encodeURIComponent(value.id)}`
        : "/calendars";
    } catch {
      notify(
        "Guarda uma cópia JSON ou resolve o erro antes de mudar de calendário.",
      );
    }
  };
  const create = async (example = false) => {
    try {
      await flush();
      const value = example ? exampleProject() : blankProject();
      const saved = await saveProject(value, null);
      setProjects((items) => [saved, ...items]);
      projectsRef.current = [saved, ...projectsRef.current];
      await open(saved);
      notify(
        example
          ? "Exemplo criado, com todas as tarefas."
          : "Um calendário em branco, pronto para começar.",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o calendário.",
      );
    }
  };
  const duplicate = async (value: CalendarProject) => {
    try {
      await flush().catch(() => {});
      const copy = cloneProject(
        projectRef.current?.id === value.id ? projectRef.current : value,
      );
      copy.name = `${copy.name} — cópia`;
      const saved = await saveProject(copy, null);
      setProjects((items) => [saved, ...items]);
      projectsRef.current = [saved, ...projectsRef.current];
      install(saved);
      location.hash = `/calendar/${encodeURIComponent(saved.id)}`;
      notify("Calendário duplicado.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Não foi possível duplicar.",
      );
    }
  };
  const rename = async (value: CalendarProject) => {
    const name = window.prompt("Nome do calendário", value.name)?.trim();
    if (!name || name === value.name) return;
    try {
      const saved = await saveProject(
        { ...value, name: name.slice(0, 200) },
        value.revision,
      );
      setProjects((items) =>
        items.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível mudar o nome.",
      );
    }
  };
  const rememberColor = (color: string) => {
    setRecent((items) => {
      const normalized = color.toLowerCase();
      const next = [
        normalized,
        ...items.filter((item) => item !== normalized),
      ].slice(0, 12);
      void writeRecentColors(next).catch(() =>
        notify("Não foi possível guardar as cores recentes."),
      );
      return next;
    });
  };
  const saveJson = async (all = false) => {
    if (all) {
      await flush().catch(() => {});
      const items = await listProjects();
      if (items.length)
        downloadBlob(backupBlob(items), "calendar-studio-backup.json");
      else notify("Ainda não existem calendários para guardar.");
    } else if (projectRef.current)
      downloadBlob(
        backupBlob([projectRef.current]),
        `${safeFilename(projectRef.current.name)}.json`,
      );
  };
  const addEvent = (date: string) => {
    if (!projectRef.current) return;
    const current = projectRef.current;
    const id = uid();
    change({
      ...current,
      events: [
        ...current.events,
        {
          id,
          text: "",
          start: date,
          end: date,
          categoryId: null,
          background: null,
          foreground: null,
          display: "span",
          order: Math.max(0, ...current.events.map((event) => event.order)) + 1,
        },
      ],
    });
    setSelectedId(id);
  };
  const months = project
    ? monthsBetween(project.settings.startMonth, project.settings.endMonth)
    : [];
  const designWidth =
    project?.settings.orientation === "portrait" ? 1080 : 1440;
  const fitZoom = Math.min(1, availableWidth / designWidth);
  const effectiveZoom = zoom ?? fitZoom;
  if (loading)
    return (
      <div className="boot-screen">
        <CalendarDays size={38} />
        <h1>Calendar Studio</h1>
        <LoaderCircle size={22} className="spin" />
        <p>A abrir os teus calendários…</p>
      </div>
    );
  if (fatal)
    return (
      <div className="boot-screen">
        <CalendarDays size={38} />
        <h1>Não foi possível abrir os calendários</h1>
        <p>{fatal}</p>
        <p>
          Verifica se este navegador permite armazenamento local e volta a
          tentar.
        </p>
        <button className="primary-button" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  return (
    <div className={`app-shell ${project ? "editor-mode" : "library-mode"}`}>
      <header className="app-topbar">
        <button className="brand" onClick={() => void open(null)}>
          <span className="brand-mark">
            <CalendarDays size={22} />
          </span>
          <span>
            calendar<span className="brand-light">studio</span>
            <span className="brand-period">.</span>
          </span>
        </button>
        {project ? (
          <>
            <div className="project-title-group">
              <button
                className="icon-button back-button"
                aria-label="Voltar aos calendários"
                onClick={() => void open(null)}
              >
                <ArrowLeft size={18} />
              </button>
              <input
                aria-label="Nome do calendário"
                value={project.name}
                maxLength={200}
                onChange={(e) => {
                  if (e.target.value)
                    change(
                      { ...project, name: e.target.value },
                      "project-name",
                    );
                }}
              />
              <span className={`save-status ${status}`} role="status">
                {status === "saving" ? (
                  <LoaderCircle size={12} className="spin" />
                ) : status === "saved" ? (
                  <Check size={12} />
                ) : (
                  <span>!</span>
                )}
                {status === "saving"
                  ? "A guardar…"
                  : status === "saved"
                    ? "Guardado neste navegador"
                    : "Erro ao guardar"}
              </span>
            </div>
            <div className="topbar-actions">
              <button
                className="icon-button mobile-menu"
                onClick={() => setMobileSidebar(!mobileSidebar)}
                aria-label="Abrir definições"
              >
                <Menu size={19} />
              </button>
              <div className="history-buttons">
                <button
                  className="icon-button"
                  aria-label="Desfazer"
                  title="Desfazer (Ctrl+Z)"
                  disabled={!history.current.past.length}
                  onClick={() => undo()}
                >
                  <Undo2 size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Refazer"
                  title="Refazer (Ctrl+Shift+Z)"
                  disabled={!history.current.future.length}
                  onClick={() => undo(true)}
                >
                  <Redo2 size={18} />
                </button>
              </div>
              <button
                className="secondary-button json-top-button"
                onClick={() => void saveJson()}
                title="Guardar projeto editável"
              >
                <FileJson size={16} />
                <span>Projeto</span>
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setSelectedId(null);
                  setExportProject(structuredClone(project));
                }}
              >
                <Download size={17} />
                <span>Descarregar</span>
              </button>
            </div>
          </>
        ) : (
          <div className="library-top-actions">
            <span className="topbar-caption">
              Um espaço para organizar o que vem a seguir.
            </span>
            <button
              className="secondary-button"
              onClick={() => importInput.current?.click()}
            >
              <Upload size={16} />
              Importar
            </button>
          </div>
        )}
      </header>
      {project ? (
        <div className="editor-layout">
          <div
            className={
              mobileSidebar ? "sidebar-wrapper mobile-open" : "sidebar-wrapper"
            }
          >
            <SettingsSidebar
              project={project}
              tab={tab}
              onTab={setTab}
              onChange={change}
              recent={recent}
              onColor={rememberColor}
              onLibrary={() => void open(null)}
              onNew={() => void create()}
            />
          </div>
          {mobileSidebar && (
            <button
              className="sidebar-scrim"
              aria-label="Fechar definições"
              onClick={() => setMobileSidebar(false)}
            />
          )}
          <main className="workspace">
            <div className="workspace-toolbar">
              <div>
                <span className="workspace-breadcrumb">ÁREA DE EDIÇÃO</span>
                <span className="workspace-months">
                  {months.length} {months.length === 1 ? "mês" : "meses"} <i />{" "}
                  {project.events.length} tarefas
                </span>
              </div>
              <span className="workspace-hint">
                <span>✦</span> Clica num dia para começar
              </span>
              <div className="zoom-controls">
                <button
                  aria-label="Diminuir zoom"
                  onClick={() => setZoom(Math.max(0.15, effectiveZoom - 0.1))}
                >
                  <Minus size={14} />
                </button>
                <button
                  className="zoom-value"
                  title="Ajustar à janela"
                  onClick={() => setZoom(null)}
                >
                  {Math.round(effectiveZoom * 100)}%
                </button>
                <button
                  aria-label="Aumentar zoom"
                  onClick={() => setZoom(Math.min(1.5, effectiveZoom + 0.1))}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {saveError && (
              <div className="save-error-banner">
                <span>{saveError}</span>
                <button onClick={() => void flush().catch(() => {})}>
                  Tentar novamente
                </button>
                <button onClick={() => void saveJson()}>
                  Descarregar JSON
                </button>
                {saveError.includes("outra aba") && (
                  <>
                    <button onClick={() => void duplicate(project)}>
                      Guardar cópia
                    </button>
                    <button
                      onClick={() => {
                        void listProjects().then((items) => {
                          setProjects(items);
                          install(
                            items.find((item) => item.id === project.id) ??
                              null,
                          );
                        });
                      }}
                    >
                      Reabrir versão guardada
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="canvas-scroll" ref={viewport}>
              <div className="canvas-surround">
                <div className="canvas-caption">
                  <span>O TEU CALENDÁRIO</span>
                  <span>
                    {project.settings.orientation === "landscape"
                      ? "Horizontal"
                      : "Vertical"}{" "}
                    · {project.settings.columns} colunas
                  </span>
                </div>
                <div
                  className="canvas-size"
                  style={{
                    width: designWidth * effectiveZoom,
                    height: documentHeight * effectiveZoom,
                  }}
                >
                  <div
                    className="canvas-transform"
                    style={{
                      width: designWidth,
                      transform: `scale(${effectiveZoom})`,
                    }}
                  >
                    <CalendarDocument
                      ref={documentNode}
                      project={project}
                      months={months.slice(0, shownMonths)}
                      selectedId={selectedId ?? undefined}
                      onDay={addEvent}
                      onEvent={(event) => setSelectedId(event.id)}
                    />
                  </div>
                </div>
                {months.length > shownMonths && (
                  <button
                    className="secondary-button load-months"
                    onClick={() => setShownMonths((count) => count + 24)}
                  >
                    Mostrar mais 24 meses
                  </button>
                )}
                <div className="canvas-footnote">
                  <ShieldCheck size={13} />
                  <span>
                    As tuas ideias ficam contigo. Tudo guardado neste navegador.
                  </span>
                </div>
              </div>
            </div>
          </main>
          {selectedId &&
            project.events.some((event) => event.id === selectedId) && (
              <EventEditor
                key={selectedId}
                project={project}
                eventId={selectedId}
                onChange={change}
                onClose={() => setSelectedId(null)}
                recent={recent}
                onColor={rememberColor}
              />
            )}
        </div>
      ) : (
        <main className="library-main">
          <div className="library-hero">
            <div>
              <span className="eyebrow">
                <span className="eyebrow-dot" /> O TEU ESPAÇO DE PLANEAMENTO
              </span>
              <h1>
                Grandes planos.
                <br />
                <span>Um mês de cada vez.</span>
              </h1>
              <p>
                Cria calendários que fazem sentido para ti.
                <br />
                Experimenta, organiza e dá cor ao que vem a seguir.
              </p>
            </div>
            <div className="hero-illustration" aria-hidden="true">
              <div className="hero-orbit" />
              <div className="hero-calendar">
                <div className="hero-calendar-top">
                  <span>UM NOVO COMEÇO</span>
                  <CalendarDays size={18} />
                </div>
                <div className="hero-calendar-grid">
                  {Array.from({ length: 21 }, (_, index) => (
                    <span
                      className={
                        [4, 5, 6, 10, 16, 17].includes(index)
                          ? "filled"
                          : index === 12
                            ? "peach"
                            : ""
                      }
                      key={index}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
                <div className="hero-note">
                  <Sparkles size={14} /> Há espaço para as tuas ideias.
                </div>
              </div>
              <span className="hero-star">✳</span>
            </div>
          </div>
          <div className="library-section-heading">
            <div>
              <h2>
                Os meus calendários <span>{projects.length}</span>
              </h2>
              <p>Continua de onde ficaste ou começa uma ideia nova.</p>
            </div>
            <div className="button-row">
              <button className="text-button" onClick={() => void create(true)}>
                Criar exemplo
              </button>
              <button className="primary-button" onClick={() => void create()}>
                <Plus size={17} />
                Novo calendário
              </button>
            </div>
          </div>
          <div className="project-grid">
            {projects.map((item) => (
              <article className="project-card" key={item.id}>
                <button
                  className="project-thumbnail"
                  onClick={() => void open(item)}
                  aria-label={`Abrir ${item.name}`}
                >
                  <div className="thumbnail-render">
                    <CalendarDocument
                      project={item}
                      months={monthsBetween(
                        item.settings.startMonth,
                        item.settings.endMonth,
                      ).slice(0, 4)}
                    />
                  </div>
                  <span className="open-project">
                    Abrir calendário <ArrowUpRight size={16} />
                  </span>
                </button>
                <div className="project-card-body">
                  <button
                    className="project-card-title"
                    onClick={() => void open(item)}
                  >
                    {item.name}
                  </button>
                  <p>
                    {monthCount(
                      item.settings.startMonth,
                      item.settings.endMonth,
                    )}{" "}
                    meses <span>·</span> Editado{" "}
                    {new Intl.DateTimeFormat("pt-PT", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(item.updatedAt))}
                  </p>
                  <div className="project-card-actions">
                    <button
                      className="icon-button"
                      title="Mudar nome"
                      aria-label={`Mudar nome de ${item.name}`}
                      onClick={() => void rename(item)}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    <button
                      className="icon-button"
                      title="Duplicar"
                      aria-label={`Duplicar ${item.name}`}
                      onClick={() => void duplicate(item)}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="icon-button"
                      title="Eliminar"
                      aria-label={`Eliminar ${item.name}`}
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        downloadBlob(
                          backupBlob([item]),
                          `${safeFilename(item.name)}.json`,
                        )
                      }
                    >
                      <FileJson size={14} />
                      JSON
                    </button>
                  </div>
                </div>
              </article>
            ))}
            <button className="new-project-card" onClick={() => void create()}>
              <span>
                <Plus size={24} />
              </span>
              <strong>Uma nova possibilidade</strong>
              <p>Cria o teu próximo calendário</p>
            </button>
          </div>
          <div className="storage-notice">
            <span className="storage-notice-icon">
              <FolderOpen size={22} />
            </span>
            <div>
              <h3>Guardado aqui, neste navegador.</h3>
              <p>
                Os calendários não sincronizam entre dispositivos. Limpar os
                dados do navegador pode apagá-los. Descarrega um backup para
                guardar uma cópia.
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() => void saveJson(true)}
            >
              <Download size={16} />
              Backup de tudo
            </button>
            <button
              className="text-button"
              onClick={() => importInput.current?.click()}
            >
              Restaurar JSON
            </button>
          </div>
        </main>
      )}
      <input
        type="file"
        accept=".json,application/json"
        ref={importInput}
        hidden
        aria-label="Importar projeto JSON"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            await flush();
            const imported = await importBackup(file);
            const items = await listProjects();
            setProjects(items);
            projectsRef.current = items;
            await open(imported[0]);
            notify(`${imported.length} calendário(s) importado(s) como cópia.`);
          } catch (error) {
            notify(
              error instanceof Error
                ? error.message
                : "Não foi possível importar o ficheiro.",
            );
          }
        }}
      />
      {exportProject && (
        <ExportDialog
          project={exportProject}
          onClose={() => setExportProject(null)}
        />
      )}
      {deleteId && (
        <div className="modal-backdrop">
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Eliminar calendário"
          >
            <span className="confirm-icon">
              <Trash2 size={24} />
            </span>
            <h2>Eliminar este calendário?</h2>
            <p>
              O calendário e as suas tarefas serão eliminados deste navegador.
              Podes guardar um JSON antes de continuar.
            </p>
            <div className="button-row">
              <button
                className="secondary-button"
                onClick={() => setDeleteId(null)}
              >
                Cancelar
              </button>
              <button
                className="primary-button delete-confirm"
                onClick={async () => {
                  try {
                    await deleteProject(deleteId);
                    setProjects((items) =>
                      items.filter((item) => item.id !== deleteId),
                    );
                    setDeleteId(null);
                    notify("Calendário eliminado.");
                  } catch {
                    notify("Não foi possível eliminar o calendário.");
                  }
                }}
              >
                Eliminar calendário
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function historyReplace(id: string) {
  window.history.replaceState(null, "", `#/calendar/${encodeURIComponent(id)}`);
}
