import { useRef } from "react";
import { Moon, Sun, GanttChartSquare, Download, Upload } from "lucide-react";

interface Props {
  projectName: string | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function TopBar({ projectName, theme, onToggleTheme, onExport, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/40 px-5 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
          <GanttChartSquare className="h-4.5 w-4.5" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight">Plano</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{projectName ?? "Sin proyecto"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          title="Importar diagrama desde JSON"
        >
          <Upload className="h-3.5 w-3.5" />
          Importar
        </button>
        <button
          onClick={onExport}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          title="Exportar diagrama a JSON"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </button>
        <button
          onClick={onToggleTheme}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Cambiar tema"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
