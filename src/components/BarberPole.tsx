import { cn } from "@/lib/utils";

type BarberPoleProps = {
  /*  Spins fast while the assistant is typing.  */
  busy?: boolean;
  className?: string;
};

/*
 * Vulcan's mark: a small barber pole whose stripes keep scrolling.
 * Size it with width/height classes; caps scale with the width.
 */
export function BarberPole({ busy = false, className }: BarberPoleProps) {
  return (
    <span aria-hidden="true" className={cn("relative inline-block w-4 h-10 shrink-0", className)}>
      <span className="absolute inset-x-[15%] -top-[3px] h-[6px] rounded-full bg-steel shadow-sm" />
      <span className={cn("pole absolute inset-0", busy && "pole-fast")} />
      <span className="absolute inset-x-[15%] -bottom-[3px] h-[6px] rounded-full bg-steel shadow-sm" />
    </span>
  );
}
