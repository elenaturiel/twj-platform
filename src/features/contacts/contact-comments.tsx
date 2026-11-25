"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addContactComment, deleteContactComment } from "./actions";

export type ContactComment = { id: string; body: string; created_at: string; author: string | null; mine: boolean };

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Historial de comentarios: lo que Jaime va apuntando de cada contacto, con fecha. */
export function ContactComments({ contactId, comments }: { contactId: string; comments: ContactComment[] }) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="comments-title">
      <h2 id="comments-title" className="text-sm font-semibold">
        Comentarios
      </h2>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const body = ref.current?.value ?? "";
          start(async () => {
            const r = await addContactComment(contactId, body);
            if (!r.ok) toast.error(r.error);
            else if (ref.current) ref.current.value = "";
          });
        }}
      >
        <Textarea
          ref={ref}
          aria-label="Nuevo comentario"
          rows={3}
          placeholder="Hoy le he escrito por WhatsApp, me dice que en enero…"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Añadir comentario"}
        </Button>
      </form>
      {comments.length ? (
        <ol className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {c.author ?? "Equipo"} · {when(c.created_at)}
                </span>
                {c.mine ? (
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() =>
                      start(async () => {
                        const r = await deleteContactComment(c.id, contactId);
                        if (!r.ok) toast.error(r.error);
                      })
                    }
                  >
                    Borrar
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-sm whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p>
      )}
    </section>
  );
}
