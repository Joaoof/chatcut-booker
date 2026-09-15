import { Link } from "@tanstack/react-router";

import { BarberPole } from "@/components/BarberPole";

/*  Top bar: serif wordmark on the left, page actions on the right.  */
export function BrandHeader({
  right,
  name = "Vulcan Barber",
}: {
  right?: React.ReactNode;
  name?: string;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-10 border-b border-line bg-background/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between">
        <Link to="/" className="focus-ring group flex items-center gap-3 rounded-full">
          <BarberPole className="h-8 w-3 transition-transform duration-300 group-hover:scale-110" />
          <span className="font-serif text-[22px] leading-none text-ink">{name}</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">{right}</div>
      </div>
    </header>
  );
}
