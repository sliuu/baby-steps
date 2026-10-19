import type { Metadata } from "next";

import { PageFrame } from "@/components/ui/PageFrame";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Logo } from "@/components/ui/Logo";
import { LOGO, PAGE_WIDTH } from "@/lib/layout";
import { getStickerLibrary } from "@/lib/queries/activities";
import { createClient } from "@/lib/supabase/server";
import { suggestionsFor } from "@/lib/suggestions";
import { PieStep, ActivitiesStep, TouchStep, type StepCategory } from "./Steps";

export const metadata: Metadata = { title: "welcome · baby steps" };

type Props = { searchParams: Promise<{ step?: string | string[] }> };

/** Three steps after first sign-in: life pie, activities, stay in touch. */
export default async function OnboardingPage(props: Props) {
  const raw = (await props.searchParams).step;
  const step = raw === "2" ? 2 : raw === "3" ? 3 : 1;

  const supabase = await createClient();
  const [library, ratings, profile] = await Promise.all([
    getStickerLibrary(),
    // Newest first; the first row per category wins.
    supabase.from("category_ratings").select("category_id, level").order("rated_at", { ascending: false }),
    supabase.from("profiles").select("phone").maybeSingle(),
  ]);

  const levels: Record<string, number> = {};
  for (const row of ratings.data ?? []) levels[row.category_id] ??= row.level;

  const categories: StepCategory[] = library.map((group) => {
    const owned = group.stickers.filter((s) => !s.archived).map((s) => s.name);
    return {
      id: group.categoryId,
      name: group.categoryName.toLowerCase(),
      slug: group.slug ?? "",
      colorKey: group.colorKey,
      owned,
      suggestions: suggestionsFor(group.slug ?? "", owned),
    };
  });

  return (
    <PageFrame
      header={
        <SheetHeader
          start={<span className={LOGO}><Logo /></span>}
          end={
            <div className="flex items-center gap-s2">
              <span className="text-caption text-ink-muted">{step} of 3</span>
              {/* Progress: done and current in accent. */}
              <span aria-hidden="true" className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`h-0.5 w-5 ${n <= step ? "bg-accent-ink" : "bg-rule"}`} />
                ))}
              </span>
            </div>
          }
        />
      }
    >
      <main className={`${PAGE_WIDTH} flex flex-1 flex-col pt-s6 pb-s6 sm:pt-s7 sm:pb-s7`}>
        {step === 1 && <PieStep categories={categories} initial={levels} />}
        {step === 2 && <ActivitiesStep categories={categories} />}
        {step === 3 && <TouchStep phone={profile.data?.phone ?? null} />}
      </main>
    </PageFrame>
  );
}
