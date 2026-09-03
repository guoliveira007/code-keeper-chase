import { createFileRoute, useSearch } from "@tanstack/react-router";
import { RewardAnimation } from "@/components/RewardAnimation";
import type { RewardId } from "@/lib/rewards";

export const Route = createFileRoute("/preview-recompensa")({
  component: PreviewRecompensa,
});

function PreviewRecompensa() {
  const { id = "chama-14" } = useSearch({ strict: false }) as { id?: string };
  return <RewardAnimation id={id as RewardId} celebrate onClose={() => {}} />;
}
