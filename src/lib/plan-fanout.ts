import type { AspectRatio } from "@/types/carousel";
import type { Plan, PlanItem } from "@/types/plan";
import { createCarousel, updateCarousel } from "@/lib/carousels";
import { replacePlanItems } from "@/lib/plans";

export async function fanoutPlan(plan: Plan, aspect: AspectRatio = "4:5"): Promise<Plan> {
  const items: PlanItem[] = [];
  for (const item of plan.items) {
    if (item.status === "created" && item.carouselId) {
      items.push(item);
      continue;
    }
    const carousel = await createCarousel(item.topic, aspect);
    await updateCarousel(carousel.id, { channel: plan.channel, tags: [item.pillar] });
    items.push({ ...item, status: "created", carouselId: carousel.id });
  }
  const saved = await replacePlanItems(plan.id, items);
  return saved ?? { ...plan, items };
}
