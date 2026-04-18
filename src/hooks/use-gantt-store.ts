import { useEffect, useState, useCallback } from "react";
import type { GanttState, Project, ProjectScale, Task, Subtask, TaskColor } from "@/lib/gantt-types";
import { toISO, toISOHour, addDays, addHours, startOfHour } from "@/lib/date-utils";

const STORAGE_KEY = "gantt-state-v2";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function seed(): GanttState {
  const today = new Date();
  const p1: Project = { id: uid(), name: "Lanzamiento Web", createdAt: new Date().toISOString(), scale: "day" };
  const p2: Project = { id: uid(), name: "Campaña Q2", createdAt: new Date().toISOString(), scale: "day" };
  const p3: Project = { id: uid(), name: "Evento (por horas)", createdAt: new Date().toISOString(), scale: "hour" };
  const baseHour = startOfHour(today);
  const tasks: Task[] = [
    {
      id: uid(), projectId: p1.id, title: "Investigación de usuarios",
      start: toISO(addDays(today, -2)), end: toISO(addDays(today, 3)),
      color: "blue",
      subtasks: [
        { id: uid(), title: "Entrevistas", done: true },
        { id: uid(), title: "Síntesis", done: false },
      ],
    },
    {
      id: uid(), projectId: p1.id, title: "Diseño UI",
      start: toISO(addDays(today, 2)), end: toISO(addDays(today, 9)),
      color: "violet", subtasks: [{ id: uid(), title: "Wireframes", done: false }],
    },
    {
      id: uid(), projectId: p1.id, title: "Desarrollo frontend",
      start: toISO(addDays(today, 8)), end: toISO(addDays(today, 20)),
      color: "emerald", subtasks: [],
    },
    {
      id: uid(), projectId: p2.id, title: "Estrategia de contenido",
      start: toISO(addDays(today, 0)), end: toISO(addDays(today, 6)),
      color: "pink", subtasks: [],
    },
    {
      id: uid(), projectId: p3.id, title: "Montaje",
      start: toISOHour(baseHour), end: toISOHour(addHours(baseHour, 3)),
      color: "amber", subtasks: [],
    },
    {
      id: uid(), projectId: p3.id, title: "Apertura puertas",
      start: toISOHour(addHours(baseHour, 4)), end: toISOHour(addHours(baseHour, 6)),
      color: "cyan", subtasks: [],
    },
  ];
  return { projects: [p1, p2, p3], tasks, activeProjectId: p1.id };
}

function migrate(parsed: any): GanttState {
  // ensure scale exists on legacy projects
  const projects: Project[] = (parsed.projects ?? []).map((p: any) => ({
    ...p,
    scale: (p.scale as ProjectScale) ?? "day",
  }));
  return { projects, tasks: parsed.tasks ?? [], activeProjectId: parsed.activeProjectId ?? null };
}

function load(): GanttState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("gantt-state-v1");
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed.projects?.length) return seed();
    return migrate(parsed);
  } catch {
    return seed();
  }
}

export function useGanttStore() {
  const [state, setState] = useState<GanttState>(() =>
    typeof window === "undefined"
      ? { projects: [], tasks: [], activeProjectId: null }
      : load(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const addProject = useCallback((name: string, scale: ProjectScale = "day") => {
    const p: Project = { id: uid(), name, createdAt: new Date().toISOString(), scale };
    setState((s) => ({ ...s, projects: [...s.projects, p], activeProjectId: p.id }));
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) }));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setState((s) => {
      const projects = s.projects.filter((p) => p.id !== id);
      const tasks = s.tasks.filter((t) => t.projectId !== id);
      const activeProjectId = s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId;
      return { projects, tasks, activeProjectId };
    });
  }, []);

  const setActiveProject = useCallback((id: string) => {
    setState((s) => ({ ...s, activeProjectId: id }));
  }, []);

  const addTask = useCallback((projectId: string, partial?: Partial<Task>) => {
    const today = new Date();
    // detect scale from project
    let defaultStart = toISO(today);
    let defaultEnd = toISO(addDays(today, 4));
    setState((s) => {
      const proj = s.projects.find((p) => p.id === projectId);
      if (proj?.scale === "hour") {
        const base = startOfHour(today);
        defaultStart = toISOHour(base);
        defaultEnd = toISOHour(addHours(base, 2));
      }
      const t: Task = {
        id: partial?.id ?? uid(),
        projectId,
        title: partial?.title ?? "Nueva tarea",
        start: partial?.start ?? defaultStart,
        end: partial?.end ?? defaultEnd,
        color: partial?.color ?? "blue",
        subtasks: partial?.subtasks ?? [],
        notes: partial?.notes,
      };
      lastCreatedId = t.id;
      return { ...s, tasks: [...s.tasks, t] };
    });
    return lastCreatedId;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const setTaskColor = useCallback((id: string, color: TaskColor) => {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, color } : t)) }));
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const sub: Subtask = { id: uid(), title, done: false };
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t)),
    }));
  }, []);

  const toggleSubtask = useCallback((taskId: string, subId: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((x) => (x.id === subId ? { ...x, done: !x.done } : x)) }
          : t,
      ),
    }));
  }, []);

  const deleteSubtask = useCallback((taskId: string, subId: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, subtasks: t.subtasks.filter((x) => x.id !== subId) } : t,
      ),
    }));
  }, []);

  return {
    state, hydrated,
    addProject, renameProject, deleteProject, setActiveProject,
    addTask, updateTask, deleteTask, setTaskColor,
    addSubtask, toggleSubtask, deleteSubtask,
  };
}

let lastCreatedId = "";
