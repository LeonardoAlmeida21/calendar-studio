import { forwardRef } from "react";
import type { CSSProperties } from "react";
import type { CalendarProject, CalendarEvent } from "../lib/model";
import { eventColors } from "../lib/model";
import { monthLabel, monthWeeks, weekdayLabels } from "../lib/dates";
import { weekSegments } from "../lib/layout";
export interface DocumentProps {
  project: CalendarProject;
  months: string[];
  columns?: number;
  showTitle?: boolean;
  showLegend?: boolean;
  showFooter?: boolean;
  selectedId?: string;
  onDay?: (date: string) => void;
  onEvent?: (event: CalendarEvent) => void;
}
export const CalendarDocument = forwardRef<HTMLDivElement, DocumentProps>(
  function CalendarDocument(
    {
      project,
      months,
      columns,
      showTitle = true,
      showLegend = true,
      showFooter = true,
      selectedId,
      onDay,
      onEvent,
    },
    ref,
  ) {
    const settings = project.settings;
    const weekdays = weekdayLabels(settings.weekStartsOn, settings.locale);
    const style = {
      "--document-bg": settings.background,
      "--document-header": settings.headerBackground,
      "--document-header-text": settings.headerForeground,
      "--month-header": settings.monthBackground,
      "--month-header-text": settings.monthForeground,
      "--document-font": `${settings.fontSize}px`,
      "--event-font": `${settings.eventFontSize}px`,
    } as CSSProperties;
    const legend =
      showLegend &&
      settings.legend !== "hidden" &&
      project.categories.length > 0 ? (
        <div className="document-legend">
          {project.categories.map((category) => (
            <span key={category.id}>
              <i
                style={{
                  background: category.background,
                  borderColor: category.foreground,
                }}
              />
              {category.name}
            </span>
          ))}
        </div>
      ) : null;
    return (
      <div
        ref={ref}
        className={`calendar-document ${onDay ? "interactive-document" : ""}`}
        style={style}
        data-testid="calendar-document"
      >
        {showTitle && (settings.title || settings.subtitle) && (
          <header className="document-title">
            <h1>{settings.title}</h1>
            {settings.subtitle && <p>{settings.subtitle}</p>}
          </header>
        )}
        {settings.legend === "top" && legend}
        <div
          className="months-grid"
          style={{
            gridTemplateColumns: `repeat(${Math.min(columns ?? settings.columns, months.length || 1)},minmax(0,1fr))`,
          }}
        >
          {months.map((month) => {
            const override = settings.monthOverrides[month];
            return (
              <section className="month-panel" key={month} data-month={month}>
                <h2
                  style={
                    override
                      ? {
                          background: override.background,
                          color: override.foreground,
                        }
                      : undefined
                  }
                >
                  {monthLabel(month, settings.locale)}
                </h2>
                <div className="weekday-row">
                  {weekdays.map((day, index) => (
                    <div
                      key={index}
                      className={
                        settings.weekendHighlight &&
                        [0, 6].includes((settings.weekStartsOn + index) % 7)
                          ? "weekend"
                          : ""
                      }
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="month-weeks">
                  {monthWeeks(month, settings.weekStartsOn).map(
                    (days, week) => {
                      const { segments, lanes } = weekSegments(
                        project.events,
                        days,
                        month,
                      );
                      return (
                        <div className="week-row" key={week}>
                          <div className="day-backdrops">
                            {days.map((date) => {
                              const inside = date.startsWith(month);
                              const weekend = [0, 6].includes(
                                new Date(`${date}T00:00:00Z`).getUTCDay(),
                              );
                              return (
                                <button
                                  tabIndex={onDay && inside ? 0 : -1}
                                  aria-label={
                                    inside
                                      ? `Adicionar tarefa em ${date}`
                                      : undefined
                                  }
                                  disabled={!inside || !onDay}
                                  className={`day-cell ${inside ? "" : "outside"} ${settings.weekendHighlight && weekend ? "weekend" : ""}`}
                                  key={date}
                                  onClick={() => onDay?.(date)}
                                  data-date={inside ? date : undefined}
                                />
                              );
                            })}
                          </div>
                          <div
                            className="events-grid"
                            style={{
                              gridTemplateRows: `22px ${lanes ? `repeat(${lanes},auto)` : ""}`,
                            }}
                          >
                            {days.map((date, index) =>
                              date.startsWith(month) ? (
                                <span
                                  key={date}
                                  className="date-number"
                                  style={{ gridColumn: index + 1, gridRow: 1 }}
                                >
                                  {Number(date.slice(-2))}
                                </span>
                              ) : null,
                            )}
                            {segments.map((segment, index) => {
                              const colors = eventColors(
                                project,
                                segment.event,
                              );
                              return (
                                <button
                                  key={`${segment.event.id}-${index}`}
                                  tabIndex={onEvent ? 0 : -1}
                                  onClick={() => onEvent?.(segment.event)}
                                  className={`event-card ${selectedId === segment.event.id ? "selected" : ""}`}
                                  aria-label={`${segment.event.text}, ${segment.event.start}${segment.event.end !== segment.event.start ? ` a ${segment.event.end}` : ""}`}
                                  style={{
                                    background: colors.background,
                                    color: colors.foreground,
                                    gridColumn: `${segment.start + 1} / ${segment.end + 2}`,
                                    gridRow: segment.lane + 2,
                                  }}
                                >
                                  {segment.event.display === "span" &&
                                    segment.continuesBefore && (
                                      <span className="continuation before">
                                        ‹
                                      </span>
                                    )}
                                  <span>
                                    {segment.event.text || "Nova tarefa"}
                                  </span>
                                  {segment.event.display === "span" &&
                                    segment.continuesAfter && (
                                      <span className="continuation after">
                                        ›
                                      </span>
                                    )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            );
          })}
        </div>
        {settings.legend === "bottom" && legend}
        {showFooter && settings.footer && (
          <footer className="document-footer">{settings.footer}</footer>
        )}
      </div>
    );
  },
);
