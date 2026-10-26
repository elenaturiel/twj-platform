import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center", className)}>
      {Icon ? <Icon className="size-8 text-muted-foreground" aria-hidden /> : null}
      <p className="max-w-xs text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
