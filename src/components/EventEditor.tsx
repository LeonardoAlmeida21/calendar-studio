import { useEffect, useState } from "react";
import { X, Trash2, Copy, ArrowRight, Check, ChevronDown } from "lucide-react";
import type { CalendarProject, CalendarEvent } from "../lib/model";
import { eventColors, uid } from "../lib/model";
import { addDays, dateNumber } from "../lib/dates";
import { ColorPicker } from "./ColorPicker";
export function EventEditor({
  project,
  eventId,
  onChange,
  onClose,
  recent,
  onColor,
}: {
  project: CalendarProject;
  eventId: string;
  onChange: (project: CalendarProject, key?: string) => void;
  onClose: () => void;
  recent: string[];
  onColor: (color: string) => void;
}) {
  const event = project.events.find((item) => item.id === eventId)!;
  const [destination, setDestination] = useState(event.start);
  const [advanced, setAdvanced] = useState(false);
  const [dateError, setDateError] = useState("");
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  const update = (patch: Partial<CalendarEvent>, key?: string) =>
    onChange(
      {
        ...project,
        events: project.events.map((item) =>
          item.id === event.id ? { ...item, ...patch } : item,
        ),
      },
      key,
    );
  const colors = eventColors(project, event);
  const setDate = (field: "start" | "end", value: string) => {
    if (!value || value < "0001-01-01" || value > "9999-12-31") return;
    const start = field === "start" ? value : event.start;
    const end = field === "end" ? value : event.end;
    if (end < start) {
      if (field === "start" && event.start === event.end) {
        update({ start, end: start });
        setDateError("");
        return;
      }
      setDateError("O fim deve ser igual ou posterior ao início.");
      return;
    }
    setDateError("");
    update({ [field]: value });
  };
  const move = (copy: boolean) => {
    if (!destination) return;
    const duration = dateNumber(event.end) - dateNumber(event.start);
    let end: string;
    try {
      end = addDays(destination, duration);
      if (end.length !== 10) throw new Error();
    } catch {
      setDateError("A data de destino está fora do intervalo suportado.");
      return;
    }
    if (copy) {
      onChange({
        ...project,
        events: [
          ...project.events,
          {
            ...event,
            id: uid(),
            start: destination,
            end,
            order: project.events.length,
          },
        ],
      });
    } else update({ start: destination, end });
    onClose();
  };
  return (
    <aside className="event-editor" role="dialog" aria-label="Editar tarefa">
      <div className="popover-heading">
        <div>
          <span className="eyebrow">NO CALENDÁRIO</span>
          <h2>Editar tarefa</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar tarefa"
        >
          <X size={19} />
        </button>
      </div>
      <label className="field-label">
        Descrição
        <textarea
          autoFocus
          aria-label="Descrição da tarefa"
          rows={4}
          placeholder="O que vais fazer?"
          value={event.text}
          onChange={(e) => update({ text: e.target.value }, `text-${event.id}`)}
        />
      </label>
      <div className="two-fields">
        <label className="field-label">
          De
          <input
            aria-label="Data inicial da tarefa"
            type="date"
            value={event.start}
            onChange={(e) => setDate("start", e.target.value)}
          />
        </label>
        <label className="field-label">
          Até
          <input
            aria-label="Data final da tarefa"
            type="date"
            value={event.end}
            onChange={(e) => setDate("end", e.target.value)}
          />
        </label>
      </div>
      {dateError && <p className="error-text">{dateError}</p>}
      <label className="field-label">
        Categoria
        <select
          value={event.categoryId ?? ""}
          onChange={(e) =>
            update({
              categoryId: e.target.value || null,
              background: null,
              foreground: null,
            })
          }
        >
          <option value="">Sem categoria</option>
          {project.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <ColorPicker
        value={colors.background}
        onChange={(color) => {
          onColor(color);
          update({ background: color });
        }}
        recent={recent}
        label="Cor da tarefa"
      />
      <button
        className="text-button advanced-toggle"
        onClick={() => setAdvanced(!advanced)}
      >
        Mais opções{" "}
        <ChevronDown
          size={14}
          style={{ transform: advanced ? "rotate(180deg)" : undefined }}
        />
      </button>
      {advanced && (
        <div className="advanced-fields">
          <div className="inline-field">
            <label htmlFor="text-color">Cor do texto</label>
            <input
              id="text-color"
              type="color"
              value={colors.foreground}
              onChange={(e) => {
                onColor(e.target.value);
                update({ foreground: e.target.value });
              }}
            />
          </div>
          {event.categoryId && (
            <button
              className="text-button"
              onClick={() => update({ background: null, foreground: null })}
            >
              Usar cores da categoria
            </button>
          )}
          <label className="field-label">
            Atividade de vários dias
            <select
              value={event.display}
              onChange={(e) =>
                update({ display: e.target.value as CalendarEvent["display"] })
              }
            >
              <option value="span">Barra contínua</option>
              <option value="daily">Repetir em cada dia</option>
            </select>
          </label>
          <label className="field-label">
            Mover ou copiar para
            <input
              aria-label="Data de destino"
              type="date"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="secondary-button" onClick={() => move(false)}>
              <ArrowRight size={14} />
              Mover
            </button>
            <button className="secondary-button" onClick={() => move(true)}>
              <Copy size={14} />
              Copiar
            </button>
          </div>
        </div>
      )}
      <div className="popover-actions">
        <button
          className="danger-button"
          onClick={() => {
            onChange({
              ...project,
              events: project.events.filter((item) => item.id !== event.id),
            });
            onClose();
          }}
        >
          <Trash2 size={15} />
          Eliminar
        </button>
        <button className="primary-button" onClick={onClose}>
          <Check size={16} />
          Concluído
        </button>
      </div>
      <p className="quiet-note">As alterações são guardadas automaticamente.</p>
    </aside>
  );
}
