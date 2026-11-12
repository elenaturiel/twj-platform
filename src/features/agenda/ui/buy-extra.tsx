"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { buyExtraSession } from "../client-actions";
import { Button } from "@/components/ui/button";

export function BuyExtraButton({ priceLabel }: { priceLabel: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await buyExtraSession();
          if ("error" in r) return void toast.error(r.error);
          window.location.assign(r.url);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Comprar sesión extra de 1 h · {priceLabel}
    </Button>
  );
}
