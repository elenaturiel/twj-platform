import type { Metadata } from "next";
import { getFoods } from "@/features/nutrition/queries";
import { FoodManager } from "@/features/nutrition/ui/food-manager";

export const metadata: Metadata = { title: "Alimentos" };

export default async function FoodsPage() {
  const foods = await getFoods(true);
  return <FoodManager foods={foods} />;
}
