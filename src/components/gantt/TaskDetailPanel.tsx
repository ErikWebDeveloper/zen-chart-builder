import { useState } from "react";
import type { Task } from "@/lib/gantt-types";
import { TASK_COLORS } from "@/lib/gantt-types";
import { cn } from "@/lib/utils";
import { X, Trash2, Plus, Calendar } from "lucide-react";

interface Props {
  task: Task | null;
  scale: "day" | "hour";
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (taskId: string, subId: string) => void;
  onDeleteSubtask: (taskId: string, subId: string) => void;
}

export function TaskDetailPanel({
  task, scale, onClose, onUpdate, onDelete, onAddSubtask, onToggleSubtask, onDeleteSubtask,
}: Props) {
  const isHour = scale === "hour";
  const inputType = isHour ? "datetime-local" : "date";
  const [newSub, setNewSub] = useState("");

  if (!task) return null;

  const done = task.subtasks.filter((s) => s.done).length;
  const total = task.subtasks.length;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Detalle
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (confirm("¿Eliminar esta tarea?")) onDelete(task.id);
            }}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        <input
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          className="w-full bg-transparent text-lg font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Título de la tarea"
        />

        <div className="mt-5">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Color
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TASK_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => onUpdate(task.id, { color: c.id })}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition",
                  task.color === c.id
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105",
                )}
                style={{ background: `var(${c.var})` }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3 w-3" /> Inicio
            </label>
            <input
              type={inputType}
              value={task.start}
              onChange={(e) => onUpdate(task.id, { start: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3 w-3" /> Fin
            </label>
            <input
              type={inputType}
              value={task.end}
              min={task.start}
              onChange={(e) => onUpdate(task.id, { end: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Subtareas
            </label>
            {total > 0 && (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {done}/{total}
              </span>
            )}
          </div>

          {total > 0 && (
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          )}

          <ul className="space-y-1">
            {task.subtasks.map((s) => (
              <li
                key={s.id}
                className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/40"
              >
                <button
                  onClick={() => onToggleSubtask(task.id, s.id)}
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border-2 transition",
                    s.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary",
                  )}
                  aria-label={s.done ? "Marcar pendiente" : "Marcar hecho"}
                >
                  {s.done && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current stroke-[3]">
                      <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    s.done && "text-muted-foreground line-through",
                  )}
                >
                  {s.title}
                </span>
                <button
                  onClick={() => onDeleteSubtask(task.id, s.id)}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newSub.trim()) {
                onAddSubtask(task.id, newSub.trim());
                setNewSub("");
              }
            }}
            className="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 transition focus-within:border-primary"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Añadir subtarea"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>
        </div>

        <div className="mt-6">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notas
          </label>
          <textarea
            value={task.notes ?? ""}
            onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
            rows={4}
            placeholder="Detalles, contexto, links…"
            className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>
    </aside>
  );
}
