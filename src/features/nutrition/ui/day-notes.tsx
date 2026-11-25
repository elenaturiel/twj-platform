"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDayNote, deleteDayNote } from "../client-actions";

export type DayNote = { id: string; body: string; author_id: string; created_at: string; author_name: string | null };

/** Notas de un día del menú (cliente y Jaime). */
export function DayNotes({
  notes,
  date,
  clientId,
  viewerId,
}: {
  notes: DayNote[];
  date: string;
  clientId?: string;
  viewerId: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      {notes.length ? (
        <ul className="space-y-1 text-sm">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <span className="flex-1">
                <span className="text-xs text-muted-foreground">{n.author_name ?? "—"}: </span>
                {n.body}
              </span>
              {n.author_id === viewerId ? (
                <button
                  type="button"
                  aria-label="Borrar nota"
                  onClick={() => start(async () => void ((await deleteDayNote(n.id)).ok && router.refresh()))}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addDayNote({ clientId, date, body: text });
            if (!r.ok) return void toast.error(r.error);
            setText("");
            router.refresh();
          });
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nota del día (p. ej. «hoy como fuera»)"
          aria-label="Nota del día"
        />
        <Button size="sm" variant="secondary" disabled={pending || !text.trim()}>
          Añadir
        </Button>
      </form>
    </div>
  );
}
