import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ExerciseManager, type LibraryExercise } from "@/features/training/ui/exercise-manager";

export const metadata: Metadata = { title: "Biblioteca de ejercicios" };

export default async function ExercisesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("id, name, modality, muscle_groups, equipment, video_url, tags, is_active, instructions, common_mistakes")
    .order("name");
  return <ExerciseManager exercises={(data ?? []) as LibraryExercise[]} />;
}
