"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markNotificationsRead } from "./actions";

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => start(async () => void (await markNotificationsRead()))}
    >
      Marcar todo como leído
    </Button>
  );
}
