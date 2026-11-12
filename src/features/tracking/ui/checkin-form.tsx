"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CheckinQuestion } from "../queries";
import { submitCheckin } from "../client-actions";

type Value = string | number | boolean | null;

export function CheckinForm({
  checkinId,
  questions,
  metrics,
}: {
  checkinId: string;
  questions: CheckinQuestion[];
  metrics: { id: string; name: string; unit: string | null; type: string }[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Value>>({});
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: string, v: Value) => setAnswers((a) => ({ ...a, [k]: v }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitCheckin({ checkinId, answers, metrics: metricValues });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Check-in enviado. Jaime lo revisa y te contesta.");
          router.push("/progreso/checkins");
        });
      }}
    >
      {questions.map((q) => (
        <fieldset key={q.key} className="space-y-2">
          <legend className="text-sm font-medium">
            {q.label}
            {q.required ? <span className="text-destructive"> *</span> : null}
          </legend>
          {q.type === "scale" ? (
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={answers[q.key] === n}
                  onClick={() => set(q.key, n)}
                  className={cn(
                    "h-10 rounded-md border text-sm font-semibold",
                    answers[q.key] === n && "bg-primary text-primary-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : q.type === "yesno" ? (
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={answers[q.key] === v}
                  onClick={() => set(q.key, v)}
                  className={cn(
                    "h-10 flex-1 rounded-md border text-sm font-medium",
                    answers[q.key] === v && "bg-primary text-primary-foreground",
                  )}
                >
                  {v ? "Sí" : "No"}
                </button>
              ))}
            </div>
          ) : q.type === "number" ? (
            <Input
              inputMode="numeric"
              className="w-28"
              onChange={(e) => set(q.key, e.target.value === "" ? null : Number(e.target.value))}
            />
          ) : (
            <Textarea rows={3} onChange={(e) => set(q.key, e.target.value)} />
          )}
        </fieldset>
      ))}

      {metrics.length ? (
        <fieldset className="space-y-3 rounded-xl border p-3">
          <legend className="px-1 text-sm font-medium">Tus métricas de hoy</legend>
          {metrics.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Label htmlFor={`m-${m.id}`} className="flex-1 font-normal">
                {m.name}
              </Label>
              <Input
                id={`m-${m.id}`}
                className="w-28"
                inputMode={m.type === "text" ? "text" : "decimal"}
                placeholder={m.type === "scale" ? "1–10" : (m.unit ?? "")}
                value={metricValues[m.id] ?? ""}
                onChange={(e) => setMetricValues((v) => ({ ...v, [m.id]: e.target.value }))}
              />
            </div>
          ))}
        </fieldset>
      ) : null}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Enviando…" : "Enviar check-in"}
      </Button>
    </form>
  );
}
