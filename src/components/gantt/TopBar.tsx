import { Moon, Sun, GanttChartSquare } from "lucide-react";

interface Props {
  projectName: string | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function TopBar({ projectName, theme, onToggleTheme }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/40 px-5 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
          <GanttChartSquare className="h-4.5 w-4.5" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight">Plano</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">
            {projectName ?? "Sin proyecto"}
          </span>
        </div>
      </div>

      <button
        onClick={onToggleTheme}
        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label="Cambiar tema"
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    </header>
  );
}
