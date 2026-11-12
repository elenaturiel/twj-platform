import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/dal";
import { PanelMoreList } from "../panel-nav";

export const metadata: Metadata = { title: "Más" };

export default async function PanelMorePage() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-extrabold">Más</h1>
      <PanelMoreList />
    </div>
  );
}
