import type { Metadata } from "next";
import { getUnseenBadges } from "@/features/engagement/queries";
import { BadgeCelebration } from "@/features/engagement/ui/badge-celebration";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { getBadges, getStreak } from "@/features/engagement/queries";
import { StreakCard } from "@/features/engagement/ui/streak-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Medallas" };

export default async function BadgesPage() {
  const ctx = await requireClientWithAccess();
  const [badges, streak, newBadges] = await Promise.all([
    getBadges(ctx.client.id),
    getStreak(ctx.client.id),
    getUnseenBadges(ctx.client.id),
  ]);
  const got = badges.filter((b) => b.awardedAt).length;
  return (
    <div className="space-y-5">
      {newBadges.length ? <BadgeCelebration badges={newBadges} /> : null}
      <div>
        <h1 className="text-3xl font-extrabold">Medallas</h1>
        <p className="text-sm text-muted-foreground">
          {got} de {badges.length} conseguidas
        </p>
      </div>
      <StreakCard
        weeks={streak?.training_weeks ?? 0}
        best={streak?.best_training_weeks ?? 0}
        done={streak?.week_done ?? 0}
        planned={streak?.week_planned ?? 0}
      />
      {streak?.checkin_streak ? (
        <p className="text-sm text-muted-foreground">Check-ins seguidos a tiempo: {streak.checkin_streak}</p>
      ) : null}
      <ul className="grid grid-cols-3 gap-3">
        {badges.map((b) => (
          <li
            key={b.key}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border bg-card p-3 text-center",
              !b.awardedAt && "opacity-45 grayscale",
            )}
            title={b.description}
          >
            <span className="text-4xl" aria-hidden>
              {b.icon}
            </span>
            <span className="text-xs leading-tight font-semibold">{b.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {b.awardedAt
                ? new Date(b.awardedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                : "Bloqueada"}
            </span>
            <span className="sr-only">{b.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
