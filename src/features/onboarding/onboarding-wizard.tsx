"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isMinor } from "@/domain/onboarding/rules";
import { completeOnboarding } from "./actions";
import { IntakeFields } from "./intake-fields";
import { intakeSchema, type Intake, type IntakeInput } from "./schemas";

export type HealthQuestionnaire = {
  version: string;
  intro: string;
  disclaimer: string;
  questions: { key: string; label: string }[];
};

export function OnboardingWizard({
  firstName,
  questionnaire,
  today,
  defaults,
}: {
  firstName: string;
  questionnaire: HealthQuestionnaire;
  today: string;
  defaults: Partial<IntakeInput>;
}) {
  const form = useForm<IntakeInput, unknown, Intake>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { availableDays: [], allergens: [], foodBudgetPeriod: "week", foodBudgetEuros: null, ...defaults },
  });
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>({});
  const [guardian, setGuardian] = useState({ name: "", email: "" });
  const [pending, startTransition] = useTransition();

  const birthDate = form.watch("birthDate");
  const minor = typeof birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && isMinor(birthDate, today);
  const steps = ["Tu ficha", "Tu salud", ...(minor ? ["Tu tutor/a"] : [])];
  const allAnswered = questionnaire.questions.every((q) => answers[q.key] !== undefined);

  async function next() {
    if (step === 0) {
      const ok = await form.trigger();
      if (!ok) {
        toast.error("Revisa los campos marcados.");
        return;
      }
    }
    if (step === 1 && !allAnswered) {
      toast.error("Responde a todas las preguntas (sí o no).");
      return;
    }
    if (step < steps.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    submit();
  }

  function submit() {
    startTransition(async () => {
      const res = await completeOnboarding({
        intake: form.getValues(),
        health: {
          version: questionnaire.version,
          answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { answer: Boolean(v) }])),
        },
        guardian: minor ? guardian : undefined,
      });
      if (res && !res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">¿Y tú, quieres ganar?</p>
        <h1 className="text-3xl font-extrabold">{step === 0 ? `Bienvenido/a, ${firstName}` : steps[step]}</h1>
        <Progress value={((step + 1) / steps.length) * 100} aria-label={`Paso ${step + 1} de ${steps.length}`} />
        <p className="text-xs text-muted-foreground">
          Paso {step + 1} de {steps.length} · {steps[step]}
        </p>
      </div>

      {step === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            5 minutos y Jaime tiene todo lo que necesita para prepararte el plan. Puedes cambiarlo luego desde tu
            perfil.
          </p>
          <IntakeFields form={form} />
        </>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{questionnaire.intro}</p>
          <ol className="space-y-3">
            {questionnaire.questions.map((q, i) => (
              <li key={q.key} className="space-y-2 rounded-xl border p-4">
                <p className="text-sm">
                  {i + 1}. {q.label}
                </p>
                <div className="flex gap-2" role="radiogroup" aria-label={q.label}>
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      role="radio"
                      aria-checked={answers[q.key] === v}
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                      className={cn(
                        "min-h-10 flex-1 rounded-lg border text-sm font-medium",
                        answers[q.key] === v &&
                          (v ? "border-warning bg-warning/15" : "border-primary bg-primary text-primary-foreground"),
                      )}
                    >
                      {v ? "Sí" : "No"}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-lg bg-muted p-3 text-xs">{questionnaire.disclaimer}</p>
        </div>
      ) : null}

      {step === 2 && minor ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Como eres menor de edad, necesitamos que tu madre, padre o tutor/a legal lo autorice. Le mandamos un email
            y, en cuanto acepte, tienes acceso.
          </p>
          <div className="space-y-2">
            <Label htmlFor="guardianName">Nombre del tutor/a</Label>
            <Input
              id="guardianName"
              value={guardian.name}
              onChange={(e) => setGuardian({ ...guardian, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardianEmail">Email del tutor/a</Label>
            <Input
              id="guardianEmail"
              type="email"
              value={guardian.email}
              onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 flex gap-2 border-t bg-background/95 py-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
            Atrás
          </Button>
        ) : null}
        <Button type="button" className="flex-1" onClick={next} disabled={pending}>
          {pending ? "Guardando…" : step === steps.length - 1 ? "Terminar" : "Seguir"}
        </Button>
      </div>
    </div>
  );
}
