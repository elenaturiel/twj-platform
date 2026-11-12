"use client";

import { useEffect } from "react";

const send = (name: "view" | "click", ub: string) =>
  fetch("/api/public/hyrox-waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "event", name, ub }),
    keepalive: true,
  }).catch(() => {});

export function BannerTracker({ ub }: { ub: string }) {
  useEffect(() => {
    void send("view", ub);
  }, [ub]);
  return (
    <a
      href={`/hyrox?ub=${encodeURIComponent(ub)}`}
      target="_top"
      onClick={() => void send("click", ub)}
      className="inline-flex w-fit items-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold tracking-wider text-accent-foreground uppercase"
    >
      Quiero más info →
    </a>
  );
}
