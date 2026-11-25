import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/twj/empty-state";
import { DeleteNoteButton, NoteForm } from "@/features/clients/staff-forms";
import { formatDate } from "@/features/clients/ui";

export default async function ClientNotes({ params }: PageProps<"/panel/clientes/[id]/notas">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("client_notes")
    .select("id, body, created_at, profiles(full_name)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-4">
      <NoteForm clientId={id} />
      {notes?.length ? (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-2 rounded-xl border p-3">
              <div className="flex-1">
                <p className="text-sm whitespace-pre-line">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.profiles?.full_name} · {formatDate(n.created_at, true)}
                </p>
              </div>
              <DeleteNoteButton noteId={n.id} clientId={id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Sin notas. Aquí va lo que no quieres olvidar de este cliente." />
      )}
    </div>
  );
}
