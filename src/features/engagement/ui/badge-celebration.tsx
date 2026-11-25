"use client";

import { useState } from "react";
import Link from "next/link";
import { markBadgesSeen } from "../actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type NewBadge = { key: string; name: string; description: string; icon: string };

/** Muestra una vez cada medalla nueva con una animación corta. */
export function BadgeCelebration({ badges }: { badges: NewBadge[] }) {
  const [queue, setQueue] = useState(badges);
  const current = queue[0];
  if (!current) return null;
  const next = () => {
    void markBadgesSeen([current.key]);
    setQueue(queue.slice(1));
  };
  return (
    <Dialog open onOpenChange={(o) => !o && next()}>
      <DialogContent className="overflow-hidden text-center sm:max-w-sm">
        <div className="relative mx-auto mt-4 flex size-28 items-center justify-center">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="twj-burst absolute top-1/2 left-1/2 size-2 rounded-full bg-accent"
              style={{ "--a": `${i * 30}deg`, animationDelay: `${(i % 3) * 60}ms` } as React.CSSProperties}
            />
          ))}
          <span
            className="twj-pop flex size-28 items-center justify-center rounded-full bg-accent/15 text-6xl ring-4 ring-accent"
            aria-hidden
          >
            {current.icon}
          </span>
        </div>
        <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase">Nueva medalla</p>
        <DialogTitle className="text-2xl font-extrabold">{current.name}</DialogTitle>
        <DialogDescription>{current.description}</DialogDescription>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" asChild onClick={next}>
            <Link href="/medallas">Ver colección</Link>
          </Button>
          <Button onClick={next}>{queue.length > 1 ? "Siguiente" : "¡Vamos!"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
