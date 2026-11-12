"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { formatEuros } from "@/lib/money";
import { cn } from "@/lib/utils";
import { previewQuote, startSignup, type PublicQuote } from "./actions";

type Props = {
  planKey: string;
  planName: string;
  annualAllowed: boolean;
  squadAllowed: boolean;
  initialInterval: "month" | "year";
  loggedInAs: string | null;
  initialSquadCode?: string;
};

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

export function SignupForm(props: Props) {
  const [state, action, pending] = useActionState(startSignup, undefined);
  const [interval, setIntervalValue] = useState(props.initialInterval);
  const [studentClaim, setStudentClaim] = useState(false);
  const [squadMode, setSquadMode] = useState<"none" | "create" | "join">(props.initialSquadCode ? "join" : "none");
  const [squadCode, setSquadCode] = useState(props.initialSquadCode ?? "");
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, startQuote] = useTransition();
  const fe = state?.fieldErrors ?? {};

  useEffect(() => {
    const t = setTimeout(() => {
      startQuote(async () => {
        const res = await previewQuote({
          planKey: props.planKey,
          interval,
          studentClaim,
          squadCode: squadMode === "join" ? squadCode : "",
          promoCode,
        });
        if ("error" in res) {
          setQuoteError(res.error);
          setQuote(null);
        } else {
          setQuoteError(null);
          setQuote(res);
        }
      });
    }, 350);
    return () => clearTimeout(t);
  }, [props.planKey, interval, studentClaim, squadMode, squadCode, promoCode]);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_340px]" noValidate>
      <input type="hidden" name="planKey" value={props.planKey} />
      <input type="hidden" name="interval" value={interval} />
      <input type="hidden" name="squadMode" value={squadMode} />

      <div className="space-y-8">
        {props.loggedInAs ? (
          <p className="rounded-lg bg-secondary p-3 text-sm">
            Vas a contratar con la cuenta <strong>{props.loggedInAs}</strong>.
          </p>
        ) : (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">1. Tu cuenta</h2>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre y apellidos</Label>
              <Input id="fullName" name="fullName" autoComplete="name" aria-invalid={!!fe.fullName} />
              <FieldError msg={fe.fullName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!fe.email}
              />
              <FieldError msg={fe.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!fe.password}
              />
              <FieldError msg={fe.password} />
            </div>
            <p className="text-xs text-muted-foreground">
              ¿Prefieres Google?{" "}
              <Link
                className="underline"
                href={`/login?next=${encodeURIComponent(`/empezar/cuenta?plan=${props.planKey}&intervalo=${interval}`)}`}
              >
                Entra con Google
              </Link>{" "}
              y vuelves aquí.
            </p>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold">{props.loggedInAs ? "1" : "2"}. Pago y descuentos</h2>
          {props.annualAllowed ? (
            <RadioGroup
              value={interval}
              onValueChange={(v) => setIntervalValue(v as "month" | "year")}
              className="grid grid-cols-2 gap-2"
            >
              {(["month", "year"] as const).map((i) => (
                <Label
                  key={i}
                  htmlFor={`interval-${i}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border p-3",
                    interval === i && "border-accent",
                  )}
                >
                  <RadioGroupItem id={`interval-${i}`} value={i} />
                  {i === "month" ? "Mensual" : "Anual (−20 %)"}
                </Label>
              ))}
            </RadioGroup>
          ) : null}

          <Label className="flex items-start gap-3 font-normal">
            <Checkbox name="studentClaim" checked={studentClaim} onCheckedChange={(v) => setStudentClaim(v === true)} />
            <span>
              Soy universitario/a (−10 %).{" "}
              <span className="text-muted-foreground">Subirás una foto del carné y Jaime la verifica.</span>
            </span>
          </Label>

          {props.squadAllowed ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">¿Te apuntas con tu squad?</p>
              <RadioGroup
                value={squadMode}
                onValueChange={(v) => setSquadMode(v as typeof squadMode)}
                className="space-y-1"
              >
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="none" /> Voy por mi cuenta
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="create" /> Creo un squad y paso el código a mis amigos
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="join" /> Tengo código de squad
                </Label>
              </RadioGroup>
              {squadMode === "join" ? (
                <div className="space-y-1">
                  <Input
                    name="squadCode"
                    placeholder="SQUAD-XXXXXX"
                    value={squadCode}
                    onChange={(e) => setSquadCode(e.target.value.toUpperCase())}
                    aria-invalid={quote?.squadCodeStatus === "invalid" || !!fe.squadCode}
                  />
                  {quote?.squadCodeStatus === "invalid" ? <FieldError msg="Ese código no existe." /> : null}
                  {quote?.squadCodeStatus === "ok" ? (
                    <p className="text-xs text-muted-foreground">
                      En ese squad ya hay {quote.squadFriends} {quote.squadFriends === 1 ? "persona" : "personas"}{" "}
                      entrenando. El descuento empieza con 2 amigos (3 personas).
                    </p>
                  ) : null}
                </div>
              ) : null}
              {squadMode === "create" ? (
                <p className="text-xs text-muted-foreground">
                  Al pagar te damos tu código. Cuando entren 2 amigos, todos pasáis a −15 % (y con 3, a −25 %).
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="promoCode">Código promocional (opcional)</Label>
            <Input id="promoCode" name="promoCode" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
            {quote?.promoCodeStatus === "invalid" ? <FieldError msg="Código no válido para este plan." /> : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{props.loggedInAs ? "2" : "3"}. Consentimientos</h2>
          <Label className="flex items-start gap-3 font-normal">
            <Checkbox name="acceptTerms" aria-invalid={!!fe.acceptTerms} />
            <span>
              Acepto los{" "}
              <Link href="/legal/terminos" target="_blank" className="underline">
                términos del servicio
              </Link>{" "}
              y la{" "}
              <Link href="/legal/privacidad" target="_blank" className="underline">
                política de privacidad
              </Link>
              .
            </span>
          </Label>
          <FieldError msg={fe.acceptTerms} />
          <Label className="flex items-start gap-3 font-normal">
            <Checkbox name="acceptHealth" aria-invalid={!!fe.acceptHealth} />
            <span>
              Consiento que Train with Jaime trate mis <strong>datos de salud</strong> (lesiones, alergias, medidas…)
              para preparar mi entrenamiento y nutrición (art. 9 RGPD).
            </span>
          </Label>
          <FieldError msg={fe.acceptHealth} />
          <Label className="flex items-start gap-3 font-normal">
            <Checkbox name="acceptPhotos" />
            <span>
              Consiento subir <strong>fotos de progreso</strong> (privadas: solo las veis Jaime, Elena y tú). Opcional.
            </span>
          </Label>
          <Label className="flex items-start gap-3 font-normal">
            <Checkbox name="acceptMarketing" />
            <span>Quiero recibir novedades y promociones de TWJ. Opcional, sin spam.</span>
          </Label>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-extrabold uppercase">{props.planName}</h2>
            {loadingQuote ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Calculando" />
            ) : null}
          </div>
          {quoteError ? <p className="text-sm text-destructive">{quoteError}</p> : null}
          {quote ? (
            <div className="space-y-2 text-sm" aria-live="polite">
              <div className="flex justify-between">
                <span>Precio {quote.interval === "year" ? "anual" : "mensual"}</span>
                <span className="tabular-nums">{formatEuros(quote.listCents)}</span>
              </div>
              {quote.lines.map((l) => (
                <div key={l.label} className="flex justify-between text-success">
                  <span>{l.label}</span>
                  <span className="tabular-nums">−{formatEuros(l.amountCents)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Pagas hoy</span>
                <span className="text-2xl font-extrabold tabular-nums">{formatEuros(quote.totalCents)}</span>
              </div>
              {quote.interval === "year" ? (
                <p className="text-xs text-muted-foreground">
                  Equivale a {formatEuros(quote.monthlyEquivalentCents)}/mes.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Se renueva cada mes. Cancelas cuando quieras.</p>
              )}
              <p className="text-xs text-muted-foreground">IVA incluido.</p>
            </div>
          ) : null}
          {state?.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={pending || !quote}>
            {pending ? "Preparando el pago…" : "Ir al pago"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Pago seguro con Stripe. No guardamos tu tarjeta.</p>
        </div>
      </aside>
    </form>
  );
}
