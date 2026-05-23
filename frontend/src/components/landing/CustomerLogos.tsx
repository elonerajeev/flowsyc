import { useEffect, useRef, useState } from "react";

const companies = [
  "TechFlow", "ScaleUp Co", "GrowthLab", "Innovate.io", "PeopleFirst",
  "DataDriven", "CloudSync", "NexusAI", "BrightPath", "CoreLogic",
  "Zenith Labs", "Pinnacle Co",
];

export default function CustomerLogos() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let animId: number;
    let pos = 0;
    const speed = 0.5;
    const animate = () => {
      if (!hovered) {
        pos += speed;
        el.scrollLeft = pos;
        if (pos >= el.scrollWidth / 2) pos = 0;
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [hovered]);

  const doubled = [...companies, ...companies];

  return (
    <section className="bg-background px-4 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="mb-10 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Trusted by teams at
        </p>

        <div
          ref={scrollRef}
          className="overflow-hidden"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="flex gap-12 sm:gap-16 md:gap-20">
            {doubled.map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 px-6 py-3 text-base font-bold text-muted-foreground/60 transition-colors hover:text-foreground/50 hover:border-border whitespace-nowrap sm:px-8 sm:py-4 sm:text-lg"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
