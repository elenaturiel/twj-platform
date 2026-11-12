"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEuros } from "@/lib/money";
import type { PublicPlan } from "./public-plans";

const FOUNDER_MONTHLY_CENTS_OFF = 500; // solo para mostrar el precio tachado; el cálculo real es del servidor

export function PlanPicker({
  plans,
  founderSlotsLeft,
  annualPercent,
}: {
  plans: PublicPlan[];
  founderSlotsLeft: number;
  annualPercent: number;
}) {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <div className="space-y-6">
      <div className="mx-auto flex w-fit rounded-full bg-muted p-1" role="radiogroup" aria-label="Forma de pago">
        {(["month", "year"] as const).map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={interval === i}
            onClick={() => setInterval(i)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === i ? "bg-background shadow-card" : "text-muted-foreground",
            )}
          >
            {i === "month" ? "Mensual" : `Anual · ahorra ${annualPercent} %`}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isFounder = plan.key === "mvp" && founderSlotsLeft > 0;
          const monthly =
            plan.priceCents === null ? null : plan.priceCents - (isFounder ? FOUNDER_MONTHLY_CENTS_OFF : 0);
          const showAnnual = interval === "year" && plan.annualAllowed && monthly !== null;
          const shown =
            monthly === null ? null : showAnnual ? Math.round(monthly * (1 - annualPercent / 100)) : monthly;
          const href = plan.requiresApplication
            ? "/empezar/peak"
            : `/empezar/cuenta?plan=${plan.key}&intervalo=${showAnnual ? "year" : "month"}`;

          return (
            <Card
              key={plan.key}
              className={cn("flex flex-col", plan.key === "mvp" && "border-accent ring-2 ring-accent/30")}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-heading text-2xl font-extrabold uppercase">{plan.name}</CardTitle>
                  {plan.badge ? (
                    <Badge variant={plan.key === "mvp" ? "default" : "secondary"}>{plan.badge}</Badge>
                  ) : null}
                </div>
                <CardDescription>{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  {shown === null ? (
                    <p className="text-2xl font-bold">A medida</p>
                  ) : (
                    <p className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tabular-nums">{formatEuros(shown)}</span>
                      <span className="text-sm text-muted-foreground">/mes</span>
                      {isFounder ? (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatEuros(plan.priceCents!)}
                        </span>
                      ) : null}
                    </p>
                  )}
                  {showAnnual ? (
                    <p className="text-xs text-muted-foreground">Pago anual de {formatEuros(shown! * 12)}</p>
                  ) : null}
                  {isFounder ? (
                    <p className="mt-1 text-xs font-semibold text-accent">
                      Precio fundador para siempre · quedan {founderSlotsLeft}{" "}
                      {founderSlotsLeft === 1 ? "plaza" : "plazas"}
                    </p>
                  ) : null}
                  {plan.requiresApplication ? (
                    <p className="mt-1 text-xs text-muted-foreground">Pack de 8, 10 o 12 semanas para tu evento</p>
                  ) : null}
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant={plan.key === "mvp" ? "default" : "outline"}>
                  <Link href={href}>{plan.requiresApplication ? "Solicitar Peak" : `Voy ${plan.name}`}</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
