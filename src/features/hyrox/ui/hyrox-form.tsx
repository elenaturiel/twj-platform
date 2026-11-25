"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Mismas preguntas y valores que el formulario de www.trainwithjaime.es/hyrox
const NIVEL = [
  { value: "nunca", label: "Nunca he hecho HYROX ni nada parecido" },
  { value: "gimnasio", label: "Entreno en el gimnasio, pero sin competir" },
  { value: "competido", label: "Ya he hecho alguna carrera o HYROX" },
];
const CUANDO = [
  { value: "3m", label: "En los próximos 3 meses" },
  { value: "3-6m", label: "Entre 3 y 6 meses" },
  { value: "mas-adelante", label: "Más adelante" },
  { value: "curioseando", label: "Solo estoy curioseando" },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY = "twj-hyrox-id";

function sessionId() {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function utm() {
  const p = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign"].filter((k) => p.get(k)).map((k) => [k, p.get(k)!.slice(0, 100)]),
  );
}

async function post(body: Record<string, unknown>) {
  try {
    const r = await fetch("/api/public/hyrox-waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return r.ok;
  } catch {
    return false;
  }
}

function Option({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left text-lg font-semibold transition-colors",
        selected ? "border-accent bg-accent/15" : "hover:bg-muted/50",
      )}
    >
      {children}
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-accent bg-accent text-accent-foreground" : "text-transparent",
        )}
      >
        <Check className="size-4" aria-hidden />
      </span>
    </button>
  );
}

export function HyroxForm({ ub }: { ub: string }) {
  const [step, setStep] = useState(1);
  const [nivel, setNivel] = useState("");
  const [cuando, setCuando] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const base = () => ({ id: sessionId(), ub, source: "app", ...utm() });

  useEffect(() => {
    void post({ action: "event", name: "vista", ub, ...utm() });
  }, [ub]);
  useEffect(() => heading.current?.focus(), [step, done]);

  if (done)
    return (
      <section className="space-y-4 text-center" aria-labelledby="hy-done">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Check className="size-8" aria-hidden />
        </span>
        <h2 id="hy-done" ref={heading} tabIndex={-1} className="text-5xl font-extrabold outline-none">
          Apuntado.
        </h2>
        <p className="text-lg text-muted-foreground">
          Estamos preparando el plan HYROX de Jaime. Te escribimos antes que a nadie.
        </p>
        <p className="text-2xl font-extrabold">¿Y tú, quieres ganar?</p>
      </section>
    );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <span aria-live="polite">Paso {step} de 3</span>
          {step > 1 ? (
            <button type="button" className="hover:text-foreground" onClick={() => setStep(step - 1)}>
              ← Atrás
            </button>
          ) : null}
        </div>
        <div
          role="progressbar"
          aria-label="Progreso del formulario"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {step === 1 ? (
        <section className="space-y-4" aria-labelledby="hy-t1">
          <h2 id="hy-t1" ref={heading} tabIndex={-1} className="text-3xl font-extrabold outline-none">
            ¿Cuál es tu nivel?
          </h2>
          <div className="grid gap-3" role="group" aria-labelledby="hy-t1">
            {NIVEL.map((o) => (
              <Option
                key={o.value}
                selected={nivel === o.value}
                onClick={() => {
                  setNivel(o.value);
                  void post({ action: "lead", ...base(), nivel: o.value });
                  void post({ action: "event", name: "paso1", ub, ...utm() });
                  setStep(2);
                }}
              >
                {o.label}
              </Option>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4" aria-labelledby="hy-t2">
          <h2 id="hy-t2" ref={heading} tabIndex={-1} className="text-3xl font-extrabold outline-none">
            ¿Cuándo te gustaría hacer tu HYROX?
          </h2>
          <div className="grid gap-3" role="group" aria-labelledby="hy-t2">
            {CUANDO.map((o) => (
              <Option
                key={o.value}
                selected={cuando === o.value}
                onClick={() => {
                  setCuando(o.value);
                  void post({ action: "lead", ...base(), cuando: o.value });
                  void post({ action: "event", name: "paso2", ub, ...utm() });
                  setStep(3);
                }}
              >
                {o.label}
              </Option>
            ))}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4" aria-labelledby="hy-t3">
          <h2 id="hy-t3" ref={heading} tabIndex={-1} className="text-3xl font-extrabold outline-none">
            ¿Dónde te avisamos?
          </h2>
          <p className="text-muted-foreground">Un email, y nada más. Lo prometemos (y Jaime es de fiar).</p>
          <form
            noValidate
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (sending) return;
              if (!EMAIL.test(email.trim())) return setError("Ese email no cuadra. Revísalo, anda.");
              if (!consent) return setError("Marca la casilla para que podamos escribirte.");
              setSending(true);
              const ok = await post({
                action: "lead",
                ...base(),
                email: email.trim(),
                consentimiento: true,
                website: trap,
              });
              setSending(false);
              if (!ok) return setError("No se ha podido guardar. Prueba otra vez en un momento.");
              void post({ action: "event", name: "envio", ub, ...utm() });
              setDone(true);
            }}
          >
            <div className="space-y-1">
              <label htmlFor="hy-email" className="text-sm font-semibold">
                Tu email
              </label>
              <Input
                id="hy-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "hy-error" : undefined}
                className="h-12 text-lg"
              />
            </div>
            {/* Trampa para bots */}
            <div aria-hidden className="absolute -left-[9999px] size-0 overflow-hidden">
              <label>
                No rellenar
                <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
              </label>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-5 shrink-0"
              />
              <span>
                Acepto que me escribáis solo sobre el plan HYROX. Más info en la{" "}
                <Link href="/legal/privacidad" target="_blank" className="font-semibold underline">
                  política de privacidad
                </Link>
                .
              </span>
            </label>
            <p id="hy-error" role="alert" className="min-h-5 text-sm font-semibold text-destructive">
              {error}
            </p>
            <Button type="submit" size="lg" className="w-full" disabled={sending}>
              {sending ? "Guardando…" : "Avisadme"} {!sending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
