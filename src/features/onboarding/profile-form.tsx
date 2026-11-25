"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateIntake } from "./actions";
import { IntakeFields } from "./intake-fields";
import { intakeSchema, type Intake, type IntakeInput } from "./schemas";

export function ProfileForm({ defaults }: { defaults: IntakeInput }) {
  const form = useForm<IntakeInput, unknown, Intake>({ resolver: zodResolver(intakeSchema), defaultValues: defaults });
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateIntake(values);
      if (res.ok) {
        toast.success("Guardado. Jaime ya está avisado.");
        form.reset(values);
      } else toast.error(res.error);
    }),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <IntakeFields form={form} />
      <Button type="submit" className="w-full" disabled={pending || !form.formState.isDirty}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
