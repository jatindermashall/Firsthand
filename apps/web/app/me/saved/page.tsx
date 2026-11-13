import { requireUser } from "@/lib/guard";
import { api } from "@/lib/api";
import type { Card } from "@/lib/types";
import { Grid } from "@/components/ui";
export const metadata = { title: "Saved" };
export default async function Saved() {
  await requireUser("/me/saved");
  const { items } = await api<{ items: Card[] }>("/me/saved");
  return <div className="wrap py-10 pb-16 flex flex-col gap-6"><h1 className="h-display text-4xl">Saved</h1><Grid items={items} empty="Nothing saved yet. Tap Save on any experience to keep it here." /></div>;
}
