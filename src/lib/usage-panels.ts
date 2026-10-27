import { AI_TARGETS, mcpUsage, skillUsage, repoUsage, usageBundle, type UsageStep } from "./ai-targets";
import type { CardItem } from "./view";
import type { Mcp, Repo, Skill } from "./types";
import type { UsagePanel } from "@/components/catalog/ai-usage";

function stepsFor(item: CardItem, aiId: string): UsageStep[] {
  if (item.kind === "mcps") return mcpUsage(item.raw as Mcp, aiId);
  if (item.kind === "skills") return skillUsage(item.raw as Skill, aiId);
  return repoUsage(item.raw as Repo, aiId);
}

/** Every client's install steps for one resource, computed at build time. */
export function usagePanels(item: CardItem): UsagePanel[] {
  return AI_TARGETS.map((t) => {
    const steps = stepsFor(item, t.id);
    return { id: t.id, name: t.name, blurb: t.blurb, color: t.color, steps, bundle: usageBundle(steps) };
  });
}
