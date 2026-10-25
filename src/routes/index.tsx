import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useGanttStore } from "@/hooks/use-gantt-store";
import { useTheme } from "@/hooks/use-theme";
import { TopBar } from "@/components/gantt/TopBar";
import { ProjectSidebar } from "@/components/gantt/ProjectSidebar";
import { GanttTimeline } from "@/components/gantt/GanttTimeline";
import { TaskDetailPanel } from "@/components/gantt/TaskDetailPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plano — Diagrama de Gantt minimalista" },
      {
        name: "description",
        content:
          "Organiza proyectos con un diagrama de Gantt moderno: tareas, subtareas, fechas con drag & drop y modo claro/oscuro.",
      },
      { property: "og:title", content: "Plano — Diagrama de Gantt minimalista" },
      {
        property: "og:description",
        content:
          "Diagrama de Gantt minimalista para planificar proyectos con subtareas y línea de tiempo interactiva.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const {
    state,
    hydrated,
    addProject,
    renameProject,
    deleteProject,
    setActiveProject,
    addTask,
    updateTask,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    importState,
  } = useGanttStore();
  const { theme, toggle } = useTheme();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const activeProject = state.projects.find((p) => p.id === state.activeProjectId) ?? null;
  const projectTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.projectId === state.activeProjectId)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [state.tasks, state.activeProjectId],
  );

  const taskCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const t of state.tasks) acc[t.projectId] = (acc[t.projectId] ?? 0) + 1;
    return acc;
  }, [state.tasks]);

  const selectedTask =
    state.tasks.find((t) => t.id === selectedTaskId && t.projectId === state.activeProjectId) ??
    null;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plano-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    if (
      !confirm(
        "Se reemplazarán todos los proyectos y tareas actuales por los del archivo. ¿Continuar?",
      )
    )
      return;
    try {
      const raw = await file.text();
      importState(raw);
      setSelectedTaskId(null);
    } catch (error) {
      alert(
        "No se pudo importar el archivo: " +
          (error instanceof Error ? error.message : "JSON inválido"),
      );
    }
  };

  if (!hydrated) {
    return <div className="grid min-h-screen place-items-center bg-background" />;
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar
        projectName={activeProject?.name ?? null}
        theme={theme}
        onToggleTheme={toggle}
        onExport={handleExport}
        onImport={handleImport}
      />
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={state.projects}
          activeId={state.activeProjectId}
          taskCounts={taskCounts}
          onSelect={(id) => {
            setActiveProject(id);
            setSelectedTaskId(null);
          }}
          onAdd={addProject}
          onRename={renameProject}
          onDelete={deleteProject}
        />
        {activeProject ? (
          <>
            <GanttTimeline
              tasks={projectTasks}
              scale={activeProject.scale}
              selectedId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onAddTask={() => {
                const id = addTask(activeProject.id);
                setSelectedTaskId(id);
              }}
              onUpdateTask={updateTask}
            />
            {selectedTask && (
              <TaskDetailPanel
                task={selectedTask}
                scale={activeProject.scale}
                onClose={() => setSelectedTaskId(null)}
                onUpdate={updateTask}
                onDelete={(id) => {
                  deleteTask(id);
                  setSelectedTaskId(null);
                }}
                onAddSubtask={addSubtask}
                onToggleSubtask={toggleSubtask}
                onDeleteSubtask={deleteSubtask}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-sm text-center">
              <h2 className="text-lg font-semibold">No hay proyectos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea tu primer proyecto desde la barra lateral para empezar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
