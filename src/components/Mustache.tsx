import type { AnimationItem } from "lottie-web";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type MustacheProps = {
  className?: string;
};

/*
 * Animated mustache (Lottie). The player is loaded on the client only,
 * and the animation parks on a still frame when motion is reduced.
 */
export function Mustache({ className }: MustacheProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;
    let animation: AnimationItem | null = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled) return;
      animation = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: !reduce,
        path: "/mustache.json",
      });
      if (reduce) animation.addEventListener("DOMLoaded", () => animation?.goToAndStop(75, true));
    });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className={cn("pointer-events-none", className)} />;
}
