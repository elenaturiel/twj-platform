import { AlertTriangle } from "lucide-react";
import type { Macros } from "@/domain/nutrition/macros";
import { cn } from "@/lib/utils";

/** "540 kcal · P 32 · H 60 · G 18" + avisos si faltan datos o no están verificados. */
export function MacroLine({ m, className }: { m: Macros; className?: string }) {
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular-nums", className)}
    >
      <span className="font-semibold text-foreground">{Math.round(m.kcal)} kcal</span>
      <span>P {Math.round(m.protein)} g</span>
      <span>H {Math.round(m.carbs)} g</span>
      <span>G {Math.round(m.fat)} g</span>
      {m.incomplete || m.unverified ? (
        <span
          className="inline-flex items-center gap-0.5 text-warning"
          title={
            m.incomplete ? "Faltan datos nutricionales de algún alimento" : "Algún alimento tiene datos sin verificar"
          }
        >
          <AlertTriangle className="size-3" aria-hidden />
          {m.incomplete ? "datos incompletos" : "sin verificar"}
        </span>
      ) : null}
    </span>
  );
}
