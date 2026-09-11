import { PaperCard } from "@/components/landing/PaperCard";
import { AnimatedCTA } from "@/components/landing/AnimatedCTA";
import { FadeUp } from "@/components/landing/Motion";
import { StarDoodle, FlowerDoodle, ThreadDoodle, DressSketchDoodle } from "@/components/landing/Doodles";

// Section 06 — the last page of the HRUNA fashion journal. Deep Forest background, a centered
// cream paper card, then straight into the (also-restyled) footer.
export function FinalCTA() {
  return (
    <section className="relative bg-scrapbook-forest py-24 md:py-32 overflow-hidden">
      <StarDoodle className="hidden sm:block absolute top-14 left-[10%] text-scrapbook-cream/25" size={22} />
      <FlowerDoodle className="hidden sm:block absolute bottom-16 left-[16%] text-scrapbook-rose/30" size={28} />
      <ThreadDoodle className="hidden md:block absolute top-1/2 right-[8%] text-scrapbook-moss/30" size={44} />
      <DressSketchDoodle className="hidden md:block absolute bottom-10 right-[12%] text-scrapbook-cream/20" size={48} />

      <div className="container-editorial relative flex justify-center">
        <FadeUp className="w-full max-w-lg">
          <PaperCard rotate={-1} className="px-8 py-12 md:px-14 md:py-16 text-center">
            <h2 className="font-display text-4xl md:text-5xl text-scrapbook-forest mb-3">Ready to find your piece?</h2>
            <p className="font-display italic text-xl text-scrapbook-forest/70 mb-9">Your style is waiting.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <AnimatedCTA href="/discover" size="lg" withPin className="bg-scrapbook-rose text-scrapbook-forest hover:bg-scrapbook-rose/90">
                Explore Hruna
              </AnimatedCTA>
              <AnimatedCTA
                href="/become-a-designer"
                size="lg"
                variant="secondary"
                className="border-scrapbook-forest/30 text-scrapbook-forest hover:bg-scrapbook-forest/5"
              >
                Join as a Designer
              </AnimatedCTA>
            </div>
          </PaperCard>
        </FadeUp>
      </div>
    </section>
  );
}
