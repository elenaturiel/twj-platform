import { cn } from "@/lib/utils";

/**
 * Logo de TWJ. TODO(marca): sustituir por el SVG oficial (public/brand/logo.svg)
 * y usar <Image src="/brand/logo.svg" …/>. Mientras tanto, wordmark tipográfico.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("font-heading text-xl leading-none font-extrabold tracking-tight uppercase", className)}>
      {compact ? (
        "TWJ"
      ) : (
        <>
          Train <span className="text-accent">with</span> Jaime
        </>
      )}
    </span>
  );
}
