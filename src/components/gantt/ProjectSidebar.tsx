import { useState } from "react";
import type { Project } from "@/lib/gantt-types";
import { cn } from "@/lib/utils";
import { Plus, Trash2, FolderKanban, Pencil, Check, X } from "lucide-react";

interface Props {
  projects: Project[];
  activeId: string | null;
  taskCounts: Record<string, number>;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectSidebar({
  projects, activeId, taskCounts, onSelect, onAdd, onRename, onDelete,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card/50">
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Proyectos
        </h2>
        <button
          onClick={() => setAdding(true)}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          aria-label="Nuevo proyecto"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
        {adding && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) {
                onAdd(newName.trim());
                setNewName("");
                setAdding(false);
              }
            }}
            className="mb-1 flex items-center gap-1 rounded-lg border border-border bg-background p-1.5"
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del proyecto"
              className="flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="rounded p-1 text-primary hover:bg-accent">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewName(""); }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        )}

        {projects.map((p) => {
          const isActive = p.id === activeId;
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                "group mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 transition",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/80 hover:bg-accent/60",
              )}
            >
              <FolderKanban className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
              {isEditing ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim()) onRename(p.id, editValue.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              ) : (
                <button
                  onClick={() => onSelect(p.id)}
                  className="flex-1 truncate text-left text-sm font-medium"
                >
                  {p.name}
                </button>
              )}
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {taskCounts[p.id] ?? 0}
              </span>
              <div className="flex opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => { setEditingId(p.id); setEditValue(p.name); }}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label="Renombrar"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${p.name}" y sus tareas?`)) onDelete(p.id);
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
