import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function whatsappUrl(number: string, text: string) {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}

/** Botón de urgencias con mensaje prellenado (nombre + plan). */
export function WhatsAppButton({
  number,
  clientName,
  planName,
  label,
  className,
}: {
  number: string;
  clientName: string;
  planName: string | null;
  label: string;
  className?: string;
}) {
  const text = `Hola Jaime, soy ${clientName}${planName ? ` (plan ${planName})` : ""}. `;
  return (
    <Button asChild variant="outline" size="sm" className={cn("gap-2", className)}>
      <a href={whatsappUrl(number, text)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" aria-hidden />
        {label}
      </a>
    </Button>
  );
}
