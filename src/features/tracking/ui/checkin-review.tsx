"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser";
import { reviewCheckin } from "../staff-actions";

/** Respuesta de Jaime a un check-in: texto y, si quiere, nota de voz. */
export function CheckinReview({
  checkinId,
  clientId,
  defaultReply,
}: {
  checkinId: string;
  clientId: string;
  defaultReply?: string | null;
}) {
  const router = useRouter();
  const [reply, setReply] = useState(defaultReply ?? "");
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const [pending, start] = useTransition();

  async function toggleRecording() {
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
      mr.onstop = () => {
        setAudio(new Blob(chunks, { type: mr.mimeType || "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      rec.current = mr;
      setRecording(true);
    } catch {
      toast.error("No hay acceso al micrófono.");
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        placeholder="Tu respuesta…"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        aria-label="Respuesta al check-in"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant={recording ? "destructive" : "outline"} onClick={toggleRecording}>
          {recording ? <Square className="size-4" /> : <Mic className="size-4" />}{" "}
          {recording ? "Parar" : audio ? "Grabar otra" : "Nota de voz"}
        </Button>
        {audio ? <audio controls src={URL.createObjectURL(audio)} className="h-9" /> : null}
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          disabled={pending || recording || (!reply.trim() && !audio)}
          onClick={() =>
            start(async () => {
              let voicePath: string | null = null;
              if (audio) {
                const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
                voicePath = `${clientId}/${checkinId}-${Date.now()}.${ext}`;
                const { error } = await createClient()
                  .storage.from("voice-notes")
                  .upload(voicePath, audio, { contentType: audio.type || "audio/webm" });
                if (error) return void toast.error("No se ha podido subir la nota de voz.");
              }
              const r = await reviewCheckin({ checkinId, reply, voicePath });
              if (!r.ok) return void toast.error(r.error);
              toast.success("Respuesta enviada");
              router.refresh();
            })
          }
        >
          Enviar y marcar revisado
        </Button>
      </div>
    </div>
  );
}
