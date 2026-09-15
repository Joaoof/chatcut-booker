import { Check, Eye, Scissors, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { BarberPole } from "@/components/BarberPole";
import { SERVICES } from "@/lib/booking.functions";
import { cn } from "@/lib/utils";

/*  Presentational pieces shared by the real chat and the scripted demo.  */

export type Service = (typeof SERVICES)[number];
export type Role = "bot" | "user";

const TRAIL_LABELS = ["Serviço", "Dia", "Hora", "Você", "Confirmar"];

export const CHIP =
  "chip-in lift glass2 focus-ring rounded-xl px-2 py-2.5 text-center text-sm font-medium text-ink";

const SERVICE_ICON: Record<Service["id"], typeof Scissors> = {
  corte: Scissors,
  barba: Sparkles,
  "corte-barba": Scissors,
  sobrancelha: Eye,
};

/*  Image icons live in public/icons; the line icon above is the fallback.  */
const SERVICE_IMAGE: Partial<Record<Service["id"], string>> = {
  corte: "/icons/corte.png",
  barba: "/icons/barba.png",
};

/*
 * Shows the line icon first and swaps to the image only after the browser
 * has loaded it, so a missing file never leaves a broken image behind.
 */
export function ServiceIcon({ id, className }: { id: Service["id"]; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const Icon = SERVICE_ICON[id];
  const src = SERVICE_IMAGE[id];

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setLoaded(true);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (src && loaded) return <img src={src} alt="" className={cn("object-contain", className)} />;
  return <Icon className={className} />;
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone relative overflow-hidden">
      <div className="absolute top-3 left-1/2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
      <div className="flex h-[690px] flex-col px-4 pt-12 pb-5">{children}</div>
    </div>
  );
}

export function ChatHeader({ typing, action }: { typing: boolean; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line pb-3">
      <div className="glass2 grid size-10 place-items-center rounded-full">
        <BarberPole busy={typing} className="h-6 w-2.5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Vulcan · assistente</p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            typing ? "text-brand" : "text-success",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", typing ? "bg-brand pulse-ring" : "bg-success")}
          />
          {typing ? "digitando…" : "online agora"}
        </p>
      </div>
      {action}
    </div>
  );
}

/*  Five stops; `current` is the active index and earlier stops are done.  */
export function Trail({
  current,
  onJump,
}: {
  current: number;
  onJump?: ((index: number) => void) | undefined;
}) {
  return (
    <ol className="flex items-center gap-1.5 py-3" aria-label="Etapas do agendamento">
      {TRAIL_LABELS.map((label, index) => {
        const done = current > index;
        const active = current === index;
        const clickable = done && Boolean(onJump);
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5 last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onJump?.(index)}
              className={cn(
                "focus-ring flex items-center gap-1.5 rounded-full py-0.5 pr-1.5 pl-0.5 text-[11px] font-medium transition-colors",
                clickable && "hover:bg-white/5",
                active ? "text-ink" : done ? "text-brand" : "text-slate7/60",
              )}
              title={clickable ? `Trocar ${label.toLowerCase()}` : undefined}
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full border text-[9px] transition-all duration-300",
                  done && "border-transparent bg-brand text-brand-foreground",
                  active && "pulse-ring border-brand bg-surface-2 text-brand",
                  !done && !active && "border-line text-transparent",
                )}
              >
                {done ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className={cn("truncate", !active && "hidden")}>{label}</span>
            </button>
            {index < TRAIL_LABELS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 rounded-full transition-colors duration-500",
                  done ? "bg-brand/70" : "bg-line",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Bubble({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <span
        className={cn(
          "max-w-[82%] px-4 py-2.5 text-sm leading-relaxed",
          role === "user"
            ? "bubble-user picked rounded-2xl rounded-br-sm"
            : "bubble-bot glass2 rounded-2xl rounded-bl-sm text-ink",
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex justify-start">
      <span
        className="bubble-bot glass2 flex items-center gap-1 rounded-2xl rounded-bl-sm px-4 py-3"
        aria-label="Assistente digitando"
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="typing-dot size-1.5 rounded-full bg-slate7"
            style={{ animationDelay: `${dot * 160}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

/*  Deterministic so the burst renders the same on every confirmation.  */
const CONFETTI = Array.from({ length: 18 }, (_, index) => {
  const angle = (index / 18) * Math.PI * 2;
  const distance = 90 + (index % 3) * 34;
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance * 0.7 + 60)}px`,
    rot: `${(index * 97) % 360}deg`,
    delay: `${(index % 4) * 40}ms`,
    color: ["var(--brand)", "var(--gold)", "#ffffff"][index % 3],
  };
});

export function CreamCard({
  title,
  badge,
  confetti = false,
  children,
}: {
  title: React.ReactNode;
  badge: React.ReactNode;
  confetti?: boolean;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label="Detalhes"
      className="cream chat-in relative mt-4 rounded-3xl p-4 lg:absolute lg:right-[-236px] lg:bottom-6 lg:mt-0 lg:w-[260px]"
    >
      {confetti && (
        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={
                {
                  "--dx": piece.dx,
                  "--dy": piece.dy,
                  "--rot": piece.rot,
                  "--d": piece.delay,
                  background: piece.color,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <span className="rounded-full bg-cream-ink/8 px-2 py-0.5 text-[10px] font-medium text-cream-muted">
          {badge}
        </span>
      </div>
      {children}
    </aside>
  );
}

export function Ticket({
  service,
  when,
  time,
  name,
  phone,
  done = false,
}: {
  service: Service;
  when: string;
  time: string;
  name?: string | undefined;
  phone?: string | undefined;
  done?: boolean;
}) {
  const label = (text: string) => (
    <p className="text-[9px] font-semibold tracking-widest text-cream-muted uppercase">{text}</p>
  );
  return (
    <div className="ticket relative -mx-1 rounded-2xl border border-cream-ink/10 bg-white/60">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <BarberPole className="h-7 w-2.5" busy={done} />
        <div className="flex-1">
          <p className="text-[11px] font-semibold tracking-wide uppercase">Vulcan Barber</p>
          <p className="text-[10px] text-cream-muted">Comanda de agendamento</p>
        </div>
        <p className="text-xl font-medium">R$ {service.price}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-4">
        <div>
          {label("Serviço")}
          <p className="text-sm font-medium">{service.label}</p>
          <p className="text-[11px] text-cream-muted">{service.minutes} min</p>
        </div>
        <div>
          {label("Quando")}
          <p className="text-sm font-medium">{when}</p>
          <p className="text-[11px] text-cream-muted">às {time}</p>
        </div>
      </div>
      <div className="mx-3 border-t border-dashed border-cream-ink/25" />
      <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2 px-4 pt-3", done ? "pb-9" : "pb-4")}>
        <div>
          {label("Cliente")}
          <p className={cn("text-sm font-medium", !name && "text-cream-muted/60")}>
            {name || "aguardando…"}
          </p>
        </div>
        <div>
          {label("WhatsApp")}
          <p
            className={cn(
              "text-[13px] font-medium whitespace-nowrap",
              !phone && "text-cream-muted/60",
            )}
          >
            {phone || "aguardando…"}
          </p>
        </div>
      </div>
      {done && (
        <span className="stamp absolute right-4 bottom-3 rounded-md border-2 border-emerald-700 px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] text-emerald-700 uppercase">
          Confirmado
        </span>
      )}
    </div>
  );
}
