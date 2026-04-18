export const TASK_COLORS = [
  { id: "blue", label: "Azul", var: "--task-blue" },
  { id: "violet", label: "Violeta", var: "--task-violet" },
  { id: "pink", label: "Rosa", var: "--task-pink" },
  { id: "amber", label: "Ámbar", var: "--task-amber" },
  { id: "emerald", label: "Esmeralda", var: "--task-emerald" },
  { id: "cyan", label: "Cian", var: "--task-cyan" },
  { id: "rose", label: "Rojo", var: "--task-rose" },
  { id: "slate", label: "Pizarra", var: "--task-slate" },
] as const;

export type TaskColor = (typeof TASK_COLORS)[number]["id"];

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  start: string; // ISO date YYYY-MM-DD
  end: string;   // ISO date YYYY-MM-DD (inclusive)
  color: TaskColor;
  subtasks: Subtask[];
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface GanttState {
  projects: Project[];
  tasks: Task[];
  activeProjectId: string | null;
}
