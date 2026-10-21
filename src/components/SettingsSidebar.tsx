import { useState } from "react";
import type { CalendarProject, CalendarSettings } from "../lib/model";
import { eventColors, uid } from "../lib/model";
import {
  addMonths,
  clampMonth,
  monthCount,
  monthLabel,
  monthsBetween,
} from "../lib/dates";
import { ColorPicker } from "./ColorPicker";
import {
  Plus,
  Trash2,
  SlidersHorizontal,
  Palette,
  CalendarDays,
} from "lucide-react";
export function SettingsSidebar({
  project,
  tab,
  onTab,
  onChange,
  recent,
  onColor,
  onLibrary,
  onNew,
}: {
  project: CalendarProject;
  tab: "months" | "appearance" | "colors";
  onTab: (tab: "months" | "appearance" | "colors") => void;
  onChange: (project: CalendarProject, key?: string) => void;
  recent: string[];
  onColor: (color: string) => void;
  onLibrary: () => void;
  onNew: () => void;
}) {
  const [overrideMonth, setOverrideMonth] = useState(
    project.settings.startMonth,
  );
  const [categoryId, setCategoryId] = useState("");
  const settings = project.settings;
  const update = (patch: Partial<CalendarSettings>, key?: string) =>
    onChange({ ...project, settings: { ...settings, ...patch } }, key);
  const rangeCount = monthCount(settings.startMonth, settings.endMonth);
  const setCount = (count: number) => {
    if (Number.isFinite(count) && count > 0)
      update({
        endMonth: clampMonth(
          addMonths(settings.startMonth, Math.floor(count) - 1),
        ),
      });
  };
  const selectedCategory = project.categories.find(
    (category) => category.id === categoryId,
  );
  return (
    <aside className="settings-sidebar">
      <div className="sidebar-navigation">
        <button onClick={onLibrary}>
          <CalendarDays size={17} />
          Os meus calendários
        </button>
        <button onClick={onNew}>
          <Plus size={17} />
          Novo calendário
        </button>
      </div>
      <div className="sidebar-tabs">
        <button
          className={tab === "months" ? "active" : ""}
          onClick={() => onTab("months")}
        >
          <CalendarDays size={16} />
          Meses
        </button>
        <button
          className={tab === "appearance" ? "active" : ""}
          onClick={() => onTab("appearance")}
        >
          <SlidersHorizontal size={16} />
          Design
        </button>
        <button
          className={tab === "colors" ? "active" : ""}
          onClick={() => onTab("colors")}
        >
          <Palette size={16} />
          Cores
        </button>
      </div>
      <div className="sidebar-content">
        {tab === "months" && (
          <>
            <span className="eyebrow">À TUA MEDIDA</span>
            <h2>O teu calendário</h2>
            <p className="sidebar-intro">
              Escolhe o intervalo. Dá espaço aos teus planos.
            </p>
            <label className="field-label">
              Começar em
              <input
                aria-label="Mês inicial"
                type="month"
                value={settings.startMonth}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    /^\d{4}-\d{2}$/.test(value) &&
                    value >= "0001-01" &&
                    value <= "9999-12"
                  )
                    update({
                      startMonth: value,
                      endMonth: clampMonth(addMonths(value, rangeCount - 1)),
                    });
                }}
              />
            </label>
            <label className="field-label">
              Quantos meses?
              <input
                aria-label="Número de meses"
                type="number"
                min={1}
                max={119988}
                value={rangeCount}
                onChange={(e) => setCount(e.target.valueAsNumber)}
              />
            </label>
            <label className="field-label">
              Terminar em
              <input
                aria-label="Mês final"
                type="month"
                value={settings.endMonth}
                min={settings.startMonth}
                onChange={(e) => {
                  if (
                    e.target.value >= settings.startMonth &&
                    e.target.value <= "9999-12"
                  )
                    update({ endMonth: e.target.value });
                }}
              />
            </label>
            <div className="range-summary">
              <CalendarDays size={17} />
              <span>
                <strong>
                  {rangeCount} {rangeCount === 1 ? "mês" : "meses"}
                </strong>{" "}
                na área de edição
              </span>
            </div>
            <div className="sidebar-divider" />
            <label className="field-label">
              Disposição
              <div className="segmented-control">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    className={settings.columns === count ? "active" : ""}
                    onClick={() => update({ columns: count })}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <span className="help-text">Número de colunas</span>
            </label>
            <label className="field-label">
              Orientação
              <select
                value={settings.orientation}
                onChange={(e) =>
                  update({
                    orientation: e.target
                      .value as CalendarSettings["orientation"],
                  })
                }
              >
                <option value="landscape">Horizontal</option>
                <option value="portrait">Vertical</option>
              </select>
            </label>
            <label className="field-label">
              A semana começa à
              <select
                value={settings.weekStartsOn}
                onChange={(e) =>
                  update({ weekStartsOn: Number(e.target.value) })
                }
              >
                {[
                  "Domingo",
                  "Segunda-feira",
                  "Terça-feira",
                  "Quarta-feira",
                  "Quinta-feira",
                  "Sexta-feira",
                  "Sábado",
                ].map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Idioma do calendário
              <select
                value={settings.locale}
                onChange={(e) =>
                  update({
                    locale: e.target.value as CalendarSettings["locale"],
                  })
                }
              >
                <option value="en-GB">English</option>
                <option value="pt-PT">Português</option>
              </select>
            </label>
            <div className="sidebar-tip">
              <span>✦</span>
              <p>Ao descarregar, podes escolher apenas alguns destes meses.</p>
            </div>
          </>
        )}
        {tab === "appearance" && (
          <>
            <span className="eyebrow">OS DETALHES CONTAM</span>
            <h2>Faz à tua maneira</h2>
            <label className="field-label">
              Título na imagem
              <textarea
                rows={2}
                value={settings.title}
                onChange={(e) => update({ title: e.target.value }, "title")}
              />
            </label>
            <label className="field-label">
              Subtítulo
              <textarea
                rows={2}
                value={settings.subtitle}
                onChange={(e) =>
                  update({ subtitle: e.target.value }, "subtitle")
                }
              />
            </label>
            <label className="field-label">
              Rodapé
              <textarea
                rows={3}
                value={settings.footer}
                onChange={(e) => update({ footer: e.target.value }, "footer")}
              />
            </label>
            <div className="two-fields">
              <label className="field-label">
                Texto geral
                <input
                  type="number"
                  min={9}
                  max={24}
                  value={settings.fontSize}
                  onChange={(e) => {
                    if (
                      e.target.valueAsNumber >= 9 &&
                      e.target.valueAsNumber <= 24
                    )
                      update({ fontSize: e.target.valueAsNumber });
                  }}
                />
              </label>
              <label className="field-label">
                Texto tarefas
                <input
                  aria-label="Tamanho do texto das tarefas"
                  type="number"
                  min={9}
                  max={24}
                  value={settings.eventFontSize}
                  onChange={(e) => {
                    if (
                      e.target.valueAsNumber >= 9 &&
                      e.target.valueAsNumber <= 24
                    )
                      update({ eventFontSize: e.target.valueAsNumber });
                  }}
                />
              </label>
            </div>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={settings.weekendHighlight}
                onChange={(e) => update({ weekendHighlight: e.target.checked })}
              />
              Destacar fins de semana
            </label>
            <label className="field-label">
              Legenda
              <select
                value={settings.legend}
                onChange={(e) =>
                  update({
                    legend: e.target.value as CalendarSettings["legend"],
                  })
                }
              >
                <option value="top">Acima do calendário</option>
                <option value="bottom">Abaixo do calendário</option>
                <option value="hidden">Ocultar</option>
              </select>
            </label>
            <div className="sidebar-divider" />
            {(
              [
                ["background", "Fundo do calendário"],
                ["headerBackground", "Fundo do título"],
                ["headerForeground", "Texto do título"],
                ["monthBackground", "Cabeçalhos dos meses"],
                ["monthForeground", "Texto dos meses"],
                ["eventBackground", "Cor de novas tarefas"],
                ["eventForeground", "Texto de novas tarefas"],
              ] as const
            ).map(([key, label]) => (
              <div className="inline-field" key={key}>
                <label htmlFor={`setting-${key}`}>{label}</label>
                <input
                  id={`setting-${key}`}
                  type="color"
                  value={settings[key]}
                  onChange={(e) => {
                    onColor(e.target.value);
                    update({ [key]: e.target.value });
                  }}
                />
              </div>
            ))}
            <div className="sidebar-divider" />
            <label className="field-label">
              Personalizar um mês
              <select
                value={overrideMonth}
                onChange={(e) => setOverrideMonth(e.target.value)}
              >
                {monthsBetween(settings.startMonth, settings.endMonth)
                  .slice(0, 1200)
                  .map((month) => (
                    <option key={month} value={month}>
                      {monthLabel(month, "pt-PT")}
                    </option>
                  ))}
              </select>
            </label>
            <div className="inline-field">
              <span>Fundo deste mês</span>
              <input
                aria-label="Cor do cabeçalho deste mês"
                type="color"
                value={
                  settings.monthOverrides[overrideMonth]?.background ??
                  settings.monthBackground
                }
                onChange={(e) => {
                  onColor(e.target.value);
                  update({
                    monthOverrides: {
                      ...settings.monthOverrides,
                      [overrideMonth]: {
                        background: e.target.value,
                        foreground:
                          settings.monthOverrides[overrideMonth]?.foreground ??
                          settings.monthForeground,
                      },
                    },
                  });
                }}
              />
            </div>
            <div className="inline-field">
              <span>Texto deste mês</span>
              <input
                aria-label="Cor do texto deste mês"
                type="color"
                value={
                  settings.monthOverrides[overrideMonth]?.foreground ??
                  settings.monthForeground
                }
                onChange={(e) =>
                  update({
                    monthOverrides: {
                      ...settings.monthOverrides,
                      [overrideMonth]: {
                        background:
                          settings.monthOverrides[overrideMonth]?.background ??
                          settings.monthBackground,
                        foreground: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            <button
              className="text-button"
              onClick={() => {
                const overrides = { ...settings.monthOverrides };
                delete overrides[overrideMonth];
                update({ monthOverrides: overrides });
              }}
            >
              Repor aspeto deste mês
            </button>
          </>
        )}
        {tab === "colors" && (
          <>
            <span className="eyebrow">UM POUCO DE COR</span>
            <h2>Cores e categorias</h2>
            <p className="sidebar-intro">
              As categorias ajudam a dar sentido ao teu calendário.
            </p>
            <div className="category-list">
              {project.categories.map((category) => (
                <button
                  className={category.id === categoryId ? "active" : ""}
                  key={category.id}
                  onClick={() => setCategoryId(category.id)}
                >
                  <i style={{ background: category.background }} />
                  <span>{category.name}</span>
                  <span className="category-count">
                    {
                      project.events.filter(
                        (event) => event.categoryId === category.id,
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
            <button
              className="secondary-button full-width"
              onClick={() => {
                const id = uid();
                onChange({
                  ...project,
                  categories: [
                    ...project.categories,
                    {
                      id,
                      name: "Nova categoria",
                      background: "#d4f8e6",
                      foreground: "#153c36",
                    },
                  ],
                });
                setCategoryId(id);
              }}
            >
              <Plus size={15} />
              Nova categoria
            </button>
            {selectedCategory && (
              <div className="category-edit">
                <label className="field-label">
                  Nome
                  <input
                    value={selectedCategory.name}
                    maxLength={100}
                    onChange={(e) => {
                      if (e.target.value)
                        onChange(
                          {
                            ...project,
                            categories: project.categories.map((category) =>
                              category.id === categoryId
                                ? { ...category, name: e.target.value }
                                : category,
                            ),
                          },
                          `category-${categoryId}`,
                        );
                    }}
                  />
                </label>
                <ColorPicker
                  label="Cor da categoria"
                  value={selectedCategory.background}
                  recent={recent}
                  onChange={(color) => {
                    onColor(color);
                    onChange({
                      ...project,
                      categories: project.categories.map((category) =>
                        category.id === categoryId
                          ? { ...category, background: color }
                          : category,
                      ),
                    });
                  }}
                />
                <div className="inline-field">
                  <span>Cor do texto</span>
                  <input
                    type="color"
                    value={selectedCategory.foreground}
                    onChange={(e) =>
                      onChange({
                        ...project,
                        categories: project.categories.map((category) =>
                          category.id === categoryId
                            ? { ...category, foreground: e.target.value }
                            : category,
                        ),
                      })
                    }
                  />
                </div>
                <button
                  className="danger-button"
                  onClick={() => {
                    onChange({
                      ...project,
                      categories: project.categories.filter(
                        (category) => category.id !== categoryId,
                      ),
                      events: project.events.map((event) =>
                        event.categoryId === categoryId
                          ? {
                              ...event,
                              ...{
                                background: eventColors(project, event)
                                  .background,
                                foreground: eventColors(project, event)
                                  .foreground,
                              },
                              categoryId: null,
                            }
                          : event,
                      ),
                    });
                    setCategoryId("");
                  }}
                >
                  <Trash2 size={14} />
                  Eliminar categoria
                </button>
              </div>
            )}
            <div className="sidebar-tip">
              <span>✦</span>
              <p>Também podes escolher uma cor diretamente em cada tarefa.</p>
            </div>
          </>
        )}
      </div>
      <div className="sidebar-bottom">
        <span className="local-dot" /> Guardado apenas neste navegador
      </div>
    </aside>
  );
}
