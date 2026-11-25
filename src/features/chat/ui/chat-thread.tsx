"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Mic, Paperclip, SendHorizontal, Square, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { attachmentUrl, deleteMessage, markRead, sendMessage } from "../actions";
import type { ChatMessage } from "../queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TZ = "Europe/Madrid";

function kindOf(type: string): ChatMessage["attachment_type"] {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
}

function dayLabel(iso: string) {
  const d = new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("sv-SE", { timeZone: TZ });
  if (d === today) return "Hoy";
  if (d === yesterday) return "Ayer";
  return new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}

/**
 * Hilo de chat en tiempo real (Supabase Realtime con RLS). Mensajes de texto,
 * fotos, vídeos, archivos y notas de voz. Al verlo, se marca como leído.
 */
export function ChatThread({
  conversationId,
  clientId,
  viewerId,
  initial,
  names,
  disabledReason,
  fullPage = false,
}: {
  conversationId: string;
  clientId: string;
  viewerId: string;
  initial: ChatMessage[];
  names: Record<string, string>;
  disabledReason?: string | null;
  /** En la app del cliente: la página hace scroll y el cuadro de texto queda fijo sobre la barra inferior. */
  fullPage?: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const rec = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const add = useCallback((m: ChatMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    void markRead(conversationId);
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      // Realtime aplica RLS con el token del usuario: hay que dárselo antes de suscribirse
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`chat:${conversationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          async (payload) => {
            const m = payload.new as Omit<ChatMessage, "url">;
            const url = m.attachment_path ? await attachmentUrl(m.attachment_path) : null;
            add({ ...m, url });
            if (m.sender_id !== viewerId) void markRead(conversationId);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const m = payload.new as ChatMessage;
            setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deleted_at: m.deleted_at } : x)));
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, viewerId, add]);

  async function upload(file: Blob, ext: string) {
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient()
      .storage.from("chat")
      .upload(path, file, { contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    return path;
  }

  function send(input: { body?: string; attachmentPath?: string; attachmentType?: ChatMessage["attachment_type"] }) {
    start(async () => {
      const r = await sendMessage({
        conversationId,
        clientId,
        ...input,
        attachmentType: input.attachmentType ?? undefined,
      });
      if (!r.ok) return void toast.error(r.error);
      const url = input.attachmentPath ? await attachmentUrl(input.attachmentPath) : null;
      add({
        id: r.id,
        sender_id: viewerId,
        body: input.body ?? null,
        attachment_path: input.attachmentPath ?? null,
        attachment_type: input.attachmentType ?? null,
        created_at: new Date().toISOString(),
        deleted_at: null,
        url,
      });
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return void toast.error("Máximo 50 MB por archivo.");
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 5);
      const path = await upload(file, ext);
      send({ attachmentPath: path, attachmentType: kindOf(file.type), body: text.trim() || undefined });
      setText("");
    } catch {
      toast.error("No se ha podido subir el archivo.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function toggleVoice() {
    if (recording) {
      rec.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        setUploading(true);
        try {
          const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
          send({ attachmentPath: await upload(blob, ext), attachmentType: "audio" });
        } catch {
          toast.error("No se ha podido enviar la nota de voz.");
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      rec.current = mr;
      setRecording(true);
    } catch {
      toast.error("No hay acceso al micrófono.");
    }
  }

  const busy = pending || uploading;
  const days = messages.map((m) => dayLabel(m.created_at));

  return (
    <div className={cn("flex flex-col", fullPage ? "flex-1" : "h-full min-h-0")}>
      <div
        className={cn("flex-1 space-y-2 px-1 py-3", fullPage ? "pb-20" : "overflow-y-auto")}
        role="log"
        aria-live="polite"
        aria-label="Mensajes"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay mensajes. Escribe tu duda.</p>
        ) : null}
        {messages.map((m, i) => {
          const mine = m.sender_id === viewerId;
          const day = days[i]!;
          const showDay = i === 0 || day !== days[i - 1];
          return (
            <div key={m.id}>
              {showDay ? (
                <p className="my-3 text-center text-xs text-muted-foreground first-letter:uppercase">{day}</p>
              ) : null}
              <div className={cn("group flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] space-y-1 rounded-2xl px-3 py-2 text-sm",
                    mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
                  )}
                >
                  {!mine && names[m.sender_id] ? (
                    <p className="text-xs font-semibold text-accent">{names[m.sender_id]}</p>
                  ) : null}
                  {m.deleted_at ? (
                    <p className="italic opacity-70">Mensaje eliminado</p>
                  ) : (
                    <>
                      {m.url && m.attachment_type === "image" ? (
                        <a href={m.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal */}
                          <img src={m.url} alt="Foto adjunta" className="max-h-72 rounded-lg" />
                        </a>
                      ) : null}
                      {m.url && m.attachment_type === "video" ? (
                        <video src={m.url} controls className="max-h-72 rounded-lg" />
                      ) : null}
                      {m.url && m.attachment_type === "audio" ? (
                        <audio src={m.url} controls className="h-10 max-w-full" />
                      ) : null}
                      {m.url && m.attachment_type === "file" ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 underline"
                        >
                          <FileText className="size-4" /> Archivo adjunto
                        </a>
                      ) : null}
                      {m.body ? <p className="break-words whitespace-pre-wrap">{m.body}</p> : null}
                    </>
                  )}
                  <p
                    className={cn(
                      "flex items-center justify-end gap-1 text-[10px] tabular-nums",
                      mine ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {new Date(m.created_at).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: TZ,
                    })}
                    {mine && !m.deleted_at ? (
                      <button
                        type="button"
                        aria-label="Eliminar mensaje"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                        onClick={async () => {
                          await deleteMessage(m.id);
                          setMessages((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, deleted_at: new Date().toISOString() } : x)),
                          );
                        }}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {disabledReason ? (
        <p className="border-t p-3 text-center text-sm text-muted-foreground">{disabledReason}</p>
      ) : (
        <form
          className={cn(
            "flex items-end gap-1 border-t bg-background pt-2",
            fullPage &&
              "fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4 pb-2",
          )}
          onSubmit={(e) => {
            e.preventDefault();
            const body = text.trim();
            if (!body) return;
            setText("");
            send({ body });
          }}
        >
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,application/pdf"
            onChange={(e) => onFile(e.target.files?.[0])}
            aria-label="Adjuntar archivo"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Adjuntar foto, vídeo o archivo"
            disabled={busy || recording}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip className="size-5" />
          </Button>
          <Textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={recording ? "Grabando…" : "Escribe tu mensaje"}
            aria-label="Mensaje"
            className="max-h-32 min-h-10 flex-1 resize-none"
            maxLength={4000}
            disabled={recording}
          />
          {text.trim() ? (
            <Button type="submit" size="icon" aria-label="Enviar" disabled={busy}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              variant={recording ? "destructive" : "default"}
              aria-label={recording ? "Parar y enviar nota de voz" : "Grabar nota de voz"}
              disabled={busy && !recording}
              onClick={toggleVoice}
            >
              {busy && !recording ? (
                <Loader2 className="size-5 animate-spin" />
              ) : recording ? (
                <Square className="size-5" />
              ) : (
                <Mic className="size-5" />
              )}
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
