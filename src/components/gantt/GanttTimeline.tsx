import { useEffect, useMemo, useRef, useState } from "react";
import type { Task, ProjectScale } from "@/lib/gantt-types";
import { TASK_COLORS } from "@/lib/gantt-types";
import {
  addDays, addHours, addMinutes, diffDays, diffHours, diffMinutes,
  formatHuman, isSameDay, isSameHour,
  isWeekend, monthLabel, dayMonthLabel, parseISO, startOfHour, toISO, toISOHour,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Plus, ChevronDown, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  tasks: Task[];
  scale: ProjectScale;
  selectedId: string | null;
  onSelectTask: (id: string) => void;
  onAddTask: () => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
}

const ROW_H = 52;
const LABEL_W = 240;

const DAY_ZOOM = { min: 16, default: 36, max: 96 };
const HOUR_ZOOM = { min: 18, default: 36, max: 90 };

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  taskId: string;
  mode: DragMode;
  startX: number;
  origStart: string;
  origEnd: string;
}

export function GanttTimeline({
  tasks, scale, selectedId, onSelectTask, onAddTask, onUpdateTask,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isHour = scale === "hour";
  const zoomCfg = isHour ? HOUR_ZOOM : DAY_ZOOM;
  const [unitW, setUnitW] = useState<number>(zoomCfg.default);
  // snap step in minutes (only used in hour mode): 60, 30 or 15
  const [snapMin, setSnapMin] = useState<15 | 30 | 60>(60);

  // reset zoom when scale changes
  useEffect(() => { setUnitW(zoomCfg.default); }, [scale, zoomCfg.default]);

  const { rangeStart, units } = useMemo(() => {
    const now = new Date();
    let min = now, max = now;
    for (const t of tasks) {
      const s = parseISO(t.start);
      const e = parseISO(t.end);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    if (isHour) {
      const start = startOfHour(addHours(min, -6));
      const end = addHours(max, 12);
      const total = Math.max(48, diffHours(start, end) + 1);
      const arr: Date[] = [];
      for (let i = 0; i < total; i++) arr.push(addHours(start, i));
      return { rangeStart: start, units: arr };
    }
    const start = addDays(min, -7);
    const end = addDays(max, 14);
    const total = Math.max(45, diffDays(start, end) + 1);
    const arr: Date[] = [];
    for (let i = 0; i < total; i++) arr.push(addDays(start, i));
    return { rangeStart: start, units: arr };
  }, [tasks, isHour]);

  // group units for top header (months for day, days for hour)
  const headerGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    let current: { label: string; span: number } | null = null;
    for (const d of units) {
      const lab = isHour ? dayMonthLabel(d) : monthLabel(d);
      if (!current || current.label !== lab) {
        current = { label: lab, span: 1 };
        groups.push(current);
      } else {
        current.span += 1;
      }
    }
    return groups;
  }, [units, isHour]);

  // scroll to now on mount/scale change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const idx = units.findIndex((d) => (isHour ? isSameHour(d, now) : isSameDay(d, now)));
    if (idx >= 0) {
      el.scrollLeft = Math.max(0, idx * unitW - el.clientWidth / 2 + unitW / 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // drag handlers
  useEffect(() => {
    if (!drag) return;
    function onMove(e: MouseEvent) {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      // pixels per minimum step (snap)
      const pxPerStep = isHour ? (unitW * snapMin) / 60 : unitW;
      const deltaSteps = Math.round(dx / pxPerStep);
      if (deltaSteps === 0) return;
      const s = parseISO(drag.origStart);
      const e2 = parseISO(drag.origEnd);
      let newStart = drag.origStart;
      let newEnd = drag.origEnd;
      const shift = (d: Date, n: number) =>
        isHour ? addMinutes(d, n * snapMin) : addDays(d, n);
      const fmt = (d: Date) => (isHour ? toISOHour(d) : toISO(d));
      // minimum gap: one snap step in hour mode, 0 days in day mode
      const minGap = isHour ? snapMin : 0;
      const gap = (a: Date, b: Date) =>
        isHour ? diffMinutes(a, b) : diffDays(a, b);
      if (drag.mode === "move") {
        newStart = fmt(shift(s, deltaSteps));
        newEnd = fmt(shift(e2, deltaSteps));
      } else if (drag.mode === "resize-start") {
        const ns = shift(s, deltaSteps);
        if (gap(ns, e2) >= minGap) newStart = fmt(ns);
      } else {
        const ne = shift(e2, deltaSteps);
        if (gap(s, ne) >= minGap) newEnd = fmt(ne);
      }
      onUpdateTask(drag.taskId, { start: newStart, end: newEnd });
    }
    function onUp() { setDrag(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, onUpdateTask, unitW, isHour, snapMin]);

  const totalWidth = units.length * unitW;
  const now = new Date();
  const nowOffset = isHour ? diffHours(rangeStart, now) : diffDays(rangeStart, now);

  function offsetOf(t: Task) {
    if (isHour) return diffMinutes(rangeStart, parseISO(t.start)) / 60;
    return diffDays(rangeStart, parseISO(t.start));
  }
  function spanOf(t: Task) {
    const s = parseISO(t.start);
    const e = parseISO(t.end);
    if (isHour) return Math.max(snapMin / 60, diffMinutes(s, e) / 60);
    return diffDays(s, e) + 1;
  }

  const zoomStep = Math.max(4, Math.round((zoomCfg.max - zoomCfg.min) / 8));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* toolbar */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
          </div>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {isHour ? "Por horas" : "Por días"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isHour && (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1 py-0.5 text-[11px]">
              <span className="px-1.5 text-muted-foreground">Snap</span>
              {([60, 30, 15] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSnapMin(m)}
                  className={cn(
                    "rounded px-2 py-0.5 font-medium transition",
                    snapMin === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  aria-label={`Snap ${m} minutos`}
                >
                  {m === 60 ? "1h" : `${m}m`}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1 py-0.5">
            <button
              onClick={() => setUnitW((w) => Math.max(zoomCfg.min, w - zoomStep))}
              className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="Reducir zoom"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={zoomCfg.min}
              max={zoomCfg.max}
              value={unitW}
              onChange={(e) => setUnitW(Number(e.target.value))}
              className="h-1 w-24 cursor-pointer accent-primary"
              aria-label="Zoom"
            />
            <button
              onClick={() => setUnitW((w) => Math.min(zoomCfg.max, w + zoomStep))}
              className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nueva tarea
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* labels column */}
        <div className="flex flex-col border-r border-border bg-card/30" style={{ width: LABEL_W }}>
          <div className="h-14 border-b border-border" />
          <div className="flex-1 overflow-hidden">
            {tasks.map((t) => {
              const isOpen = expanded[t.id];
              const total = t.subtasks.length;
              const done = t.subtasks.filter((s) => s.done).length;
              return (
                <div key={t.id}>
                  <div
                    style={{ height: ROW_H }}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 border-b border-border/50 px-3 transition",
                      selectedId === t.id ? "bg-accent/60" : "hover:bg-accent/30",
                    )}
                    onClick={() => onSelectTask(t.id)}
                  >
                    {total > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded((x) => ({ ...x, [t.id]: !x[t.id] }));
                        }}
                        className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-background"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="w-5" />
                    )}
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: `var(--task-${t.color})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {total > 0 ? `${done}/${total} subtareas` : formatHuman(parseISO(t.start), isHour)}
                      </div>
                    </div>
                  </div>
                  {isOpen &&
                    t.subtasks.map((s) => (
                      <div
                        key={s.id}
                        style={{ height: 32 }}
                        className="flex items-center gap-2 border-b border-border/30 bg-muted/20 pl-10 pr-3 text-xs"
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            s.done ? "bg-primary" : "bg-muted-foreground/40",
                          )}
                        />
                        <span className={cn("truncate", s.done && "text-muted-foreground line-through")}>
                          {s.title}
                        </span>
                      </div>
                    ))}
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
                Aún no hay tareas. Crea la primera.
              </div>
            )}
          </div>
        </div>

        {/* timeline */}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto scrollbar-thin">
          <div style={{ width: totalWidth }} className="relative">
            {/* header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur">
              <div className="flex h-7 border-b border-border">
                {headerGroups.map((g, i) => (
                  <div
                    key={i}
                    style={{ width: g.span * unitW }}
                    className="flex items-center px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {g.label}
                  </div>
                ))}
              </div>
              <div className="flex h-7 border-b border-border">
                {units.map((d, i) => {
                  const isNow = isHour ? isSameHour(d, now) : isSameDay(d, now);
                  const label = isHour
                    ? String(d.getHours()).padStart(2, "0")
                    : String(d.getDate());
                  return (
                    <div
                      key={i}
                      style={{ width: unitW }}
                      className={cn(
                        "flex flex-col items-center justify-center border-l border-border/40 text-[10px]",
                        !isHour && isWeekend(d) && "bg-muted/30",
                        isHour && (d.getHours() === 0) && "bg-muted/30",
                        isNow && "bg-primary/10 font-semibold text-primary",
                      )}
                    >
                      <span className={cn("tabular-nums", !isNow && "text-muted-foreground")}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* grid background */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 flex">
                {units.map((d, i) => (
                  <div
                    key={i}
                    style={{ width: unitW }}
                    className={cn(
                      "border-l border-border/30",
                      !isHour && isWeekend(d) && "bg-muted/20",
                      isHour && d.getHours() === 0 && "border-l-border/60",
                    )}
                  />
                ))}
              </div>
              {/* now line */}
              {nowOffset >= 0 && nowOffset < units.length && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary/60"
                  style={{ left: nowOffset * unitW + unitW / 2 }}
                />
              )}

              {/* task rows */}
              {tasks.map((t) => {
                const isOpen = expanded[t.id];
                const offset = offsetOf(t);
                const span = spanOf(t);
                const left = offset * unitW;
                const width = Math.max(unitW, span * unitW);
                const done = t.subtasks.filter((s) => s.done).length;
                const progress = t.subtasks.length ? done / t.subtasks.length : 0;
                const colorVar = `var(--task-${t.color})`;
                return (
                  <div key={t.id}>
                    <div style={{ height: ROW_H }} className="relative border-b border-border/50">
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onSelectTask(t.id);
                          setDrag({
                            taskId: t.id, mode: "move", startX: e.clientX,
                            origStart: t.start, origEnd: t.end,
                          });
                        }}
                        className={cn(
                          "group absolute top-1/2 flex -translate-y-1/2 cursor-grab items-center overflow-hidden rounded-lg shadow-soft transition active:cursor-grabbing",
                          selectedId === t.id && "ring-2 ring-offset-2 ring-offset-background",
                        )}
                        style={{
                          left, width, height: 30,
                          background: `color-mix(in oklab, ${colorVar} 22%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${colorVar} 55%, transparent)`,
                          // @ts-expect-error css var
                          "--tw-ring-color": colorVar,
                        }}
                      >
                        {progress > 0 && (
                          <div
                            className="absolute inset-y-0 left-0"
                            style={{
                              width: `${progress * 100}%`,
                              background: `color-mix(in oklab, ${colorVar} 45%, transparent)`,
                            }}
                          />
                        )}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDrag({
                              taskId: t.id, mode: "resize-start", startX: e.clientX,
                              origStart: t.start, origEnd: t.end,
                            });
                          }}
                          className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize opacity-0 transition group-hover:opacity-100"
                          style={{ background: colorVar }}
                        />
                        <span
                          className="relative z-10 truncate px-2.5 text-xs font-medium"
                          style={{ color: `color-mix(in oklab, ${colorVar} 75%, var(--foreground))` }}
                        >
                          {t.title}
                        </span>
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDrag({
                              taskId: t.id, mode: "resize-end", startX: e.clientX,
                              origStart: t.start, origEnd: t.end,
                            });
                          }}
                          className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize opacity-0 transition group-hover:opacity-100"
                          style={{ background: colorVar }}
                        />
                      </div>
                    </div>
                    {isOpen &&
                      t.subtasks.map((s) => (
                        <div
                          key={s.id}
                          style={{ height: 32 }}
                          className="border-b border-border/30 bg-muted/10"
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="flex items-center gap-3 border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> {isHour ? "Ahora" : "Hoy"}
        </span>
        <span>·</span>
        <span>Arrastra para mover, los bordes para redimensionar · usa el zoom para ajustar la escala</span>
        <span className="ml-auto flex items-center gap-1">
          {TASK_COLORS.map((c) => (
            <span
              key={c.id}
              title={c.label}
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: `var(${c.var})` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
