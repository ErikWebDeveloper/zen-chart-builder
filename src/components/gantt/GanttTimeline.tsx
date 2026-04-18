import { useEffect, useMemo, useRef, useState } from "react";
import type { Task } from "@/lib/gantt-types";
import { TASK_COLORS } from "@/lib/gantt-types";
import {
  addDays, diffDays, formatHuman, isSameDay, isWeekend, monthLabel, parseISO, toISO,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  tasks: Task[];
  selectedId: string | null;
  onSelectTask: (id: string) => void;
  onAddTask: () => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
}

const DAY_W = 36;
const ROW_H = 52;
const LABEL_W = 240;

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  taskId: string;
  mode: DragMode;
  startX: number;
  origStart: string;
  origEnd: string;
}

export function GanttTimeline({
  tasks, selectedId, onSelectTask, onAddTask, onUpdateTask,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { rangeStart, days } = useMemo(() => {
    const today = new Date();
    let min = today, max = today;
    for (const t of tasks) {
      const s = parseISO(t.start);
      const e = parseISO(t.end);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    const start = addDays(min, -7);
    const end = addDays(max, 14);
    const total = Math.max(45, diffDays(start, end) + 1);
    const arr: Date[] = [];
    for (let i = 0; i < total; i++) arr.push(addDays(start, i));
    return { rangeStart: start, days: arr };
  }, [tasks]);

  // group days by month for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    let current: { label: string; span: number } | null = null;
    for (const d of days) {
      const lab = monthLabel(d);
      if (!current || current.label !== lab) {
        current = { label: lab, span: 1 };
        groups.push(current);
      } else {
        current.span += 1;
      }
    }
    return groups;
  }, [days]);

  // scroll to today on first mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = days.findIndex((d) => isSameDay(d, new Date()));
    if (todayIdx >= 0) {
      el.scrollLeft = Math.max(0, todayIdx * DAY_W - el.clientWidth / 2 + DAY_W / 2);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // drag handlers
  useEffect(() => {
    if (!drag) return;

    function onMove(e: MouseEvent) {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const deltaDays = Math.round(dx / DAY_W);
      if (deltaDays === 0) return;
      const s = parseISO(drag.origStart);
      const e2 = parseISO(drag.origEnd);
      let newStart = drag.origStart;
      let newEnd = drag.origEnd;
      if (drag.mode === "move") {
        newStart = toISO(addDays(s, deltaDays));
        newEnd = toISO(addDays(e2, deltaDays));
      } else if (drag.mode === "resize-start") {
        const ns = addDays(s, deltaDays);
        if (diffDays(ns, e2) >= 0) newStart = toISO(ns);
      } else {
        const ne = addDays(e2, deltaDays);
        if (diffDays(s, ne) >= 0) newEnd = toISO(ne);
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
  }, [drag, onUpdateTask]);

  const totalWidth = days.length * DAY_W;
  const today = new Date();
  const todayOffset = diffDays(rangeStart, today);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* toolbar */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="text-sm text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
        </div>
        <button
          onClick={onAddTask}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nueva tarea
        </button>
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
                        {total > 0 ? `${done}/${total} subtareas` : formatHuman(parseISO(t.start))}
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
                {monthGroups.map((g, i) => (
                  <div
                    key={i}
                    style={{ width: g.span * DAY_W }}
                    className="flex items-center px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {g.label}
                  </div>
                ))}
              </div>
              <div className="flex h-7 border-b border-border">
                {days.map((d, i) => {
                  const isToday = isSameDay(d, today);
                  return (
                    <div
                      key={i}
                      style={{ width: DAY_W }}
                      className={cn(
                        "flex flex-col items-center justify-center border-l border-border/40 text-[10px]",
                        isWeekend(d) && "bg-muted/30",
                        isToday && "bg-primary/10 font-semibold text-primary",
                      )}
                    >
                      <span className={cn("tabular-nums", !isToday && "text-muted-foreground")}>
                        {d.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* grid background */}
            <div className="relative">
              {/* vertical day lines + weekend bands */}
              <div className="pointer-events-none absolute inset-0 flex">
                {days.map((d, i) => (
                  <div
                    key={i}
                    style={{ width: DAY_W }}
                    className={cn(
                      "border-l border-border/30",
                      isWeekend(d) && "bg-muted/20",
                    )}
                  />
                ))}
              </div>
              {/* today line */}
              {todayOffset >= 0 && todayOffset < days.length && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary/60"
                  style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                />
              )}

              {/* task rows */}
              {tasks.map((t) => {
                const isOpen = expanded[t.id];
                const offset = diffDays(rangeStart, parseISO(t.start));
                const span = diffDays(parseISO(t.start), parseISO(t.end)) + 1;
                const left = offset * DAY_W;
                const width = Math.max(DAY_W, span * DAY_W);
                const done = t.subtasks.filter((s) => s.done).length;
                const progress = t.subtasks.length ? done / t.subtasks.length : 0;
                const colorVar = `var(--task-${t.color})`;
                return (
                  <div key={t.id}>
                    <div
                      style={{ height: ROW_H }}
                      className="relative border-b border-border/50"
                    >
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
                        {/* progress fill */}
                        {progress > 0 && (
                          <div
                            className="absolute inset-y-0 left-0"
                            style={{
                              width: `${progress * 100}%`,
                              background: `color-mix(in oklab, ${colorVar} 45%, transparent)`,
                            }}
                          />
                        )}
                        {/* resize start */}
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
                        {/* resize end */}
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
          <span className="h-2 w-2 rounded-full bg-primary" /> Hoy
        </span>
        <span>·</span>
        <span>Arrastra una barra para moverla, los bordes para redimensionar</span>
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
