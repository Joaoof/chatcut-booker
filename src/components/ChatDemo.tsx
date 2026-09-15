import { useEffect, useState } from "react";

import {
  Bubble,
  CHIP,
  ChatHeader,
  CreamCard,
  PhoneFrame,
  Ticket,
  Trail,
  TypingDots,
  type Role,
} from "@/components/chat-ui";
import { SERVICES } from "@/lib/booking.functions";
import { cn } from "@/lib/utils";

/*
 * Scripted, looping preview of the booking conversation for the landing
 * page. Nothing here talks to the server; the real chat lives in /agendar.
 */

type Line = { id: number; role: Role; text: string };
type Options =
  | { kind: "none" }
  | { kind: "chips"; cols: number; items: [string, string?][]; pressed: number | null }
  | { kind: "input"; placeholder: string; typed: string }
  | { kind: "confirm"; pressed: boolean }
  | { kind: "done" };
type CardView = "services" | "days" | "slots" | "ticket";

type Action =
  | { t: "bot"; text: string; step?: number }
  | { t: "user"; text: string; step?: number }
  | { t: "chips"; cols: number; items: [string, string?][]; pick: number }
  | { t: "type"; placeholder: string; text: string }
  | { t: "card"; view: CardView; name?: string; phone?: string }
  | { t: "confirm" }
  | { t: "done" };

const COMBO = SERVICES[2];

const SCRIPT: Action[] = [
  { t: "bot", text: "E aí! 💈 Sou o assistente da Vulcan. Bora marcar seu horário?" },
  { t: "bot", text: "Qual serviço você quer hoje?" },
  {
    t: "chips",
    cols: 2,
    items: SERVICES.map((item) => [item.label, `R$ ${item.price} · ${item.minutes} min`]),
    pick: 2,
  },
  { t: "user", text: "Corte + Barba", step: 1 },
  { t: "card", view: "days" },
  {
    t: "bot",
    text: "Corte + Barba sai por R$ 85 e leva uns 60 min. Qual dia fica melhor pra você?",
  },
  {
    t: "chips",
    cols: 3,
    items: [
      ["ter 15", "hoje · 7 livres"],
      ["qua 16", "amanhã · 10 livres"],
      ["qui 17", "10 livres"],
    ],
    pick: 1,
  },
  { t: "user", text: "qua, 16 de set", step: 2 },
  { t: "card", view: "slots" },
  { t: "bot", text: "Show. Esses são os horários livres:" },
  { t: "chips", cols: 4, items: [["09:00"], ["10:00"], ["14:00"], ["16:00"]], pick: 2 },
  { t: "user", text: "14:00", step: 3 },
  { t: "card", view: "ticket" },
  { t: "bot", text: "Fechado! Como é o seu nome?" },
  { t: "type", placeholder: "Seu nome", text: "João de Deus" },
  { t: "user", text: "João de Deus" },
  { t: "card", view: "ticket", name: "João de Deus" },
  { t: "bot", text: "Prazer, João! Qual seu WhatsApp? Mando o lembrete por lá." },
  { t: "type", placeholder: "(11) 98765-4321", text: "(11) 98765-4321" },
  { t: "user", text: "(11) 98765-4321", step: 4 },
  { t: "card", view: "ticket", name: "João de Deus", phone: "(11) 98765-4321" },
  { t: "bot", text: "Tudo certo! Confere a comanda e confirma pra mim 👇" },
  { t: "confirm" },
  { t: "bot", text: "Confirmado! qua, 16 de set às 14:00. Te espero aqui 💈", step: 5 },
  { t: "done" },
];

const SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export function ChatDemo() {
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<Options>({ kind: "none" });
  const [card, setCard] = useState<{
    view: CardView;
    name?: string;
    phone?: string;
    done: boolean;
  }>({
    view: "services",
    done: false,
  });

  useEffect(() => {
    let run = 0;
    let alive = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, reduce ? 0 : ms));
    let seq = 0;

    async function play() {
      const mine = ++run;
      setLines([]);
      setOptions({ kind: "none" });
      setStep(0);
      setTyping(false);
      setCard({ view: "services", done: false });
      let last: { name?: string; phone?: string } = {};
      for (const action of SCRIPT) {
        if (!alive || mine !== run) return;
        if (action.t === "bot") {
          setTyping(true);
          await sleep(Math.min(1100, 380 + action.text.length * 14));
          if (!alive || mine !== run) return;
          setTyping(false);
          setLines((prev) => [...prev, { id: ++seq, role: "bot", text: action.text }]);
          if (action.step !== undefined) setStep(action.step);
          await sleep(220);
        } else if (action.t === "user") {
          setOptions({ kind: "none" });
          setLines((prev) => [...prev, { id: ++seq, role: "user", text: action.text }]);
          if (action.step !== undefined) setStep(action.step);
          await sleep(320);
        } else if (action.t === "card") {
          last = {
            ...(action.name ? { name: action.name } : {}),
            ...(action.phone ? { phone: action.phone } : {}),
          };
          setCard({ view: action.view, ...last, done: false });
        } else if (action.t === "chips") {
          setOptions({ kind: "chips", cols: action.cols, items: action.items, pressed: null });
          await sleep(1300);
          if (!alive || mine !== run) return;
          setOptions({
            kind: "chips",
            cols: action.cols,
            items: action.items,
            pressed: action.pick,
          });
          await sleep(320);
        } else if (action.t === "type") {
          setOptions({ kind: "input", placeholder: action.placeholder, typed: "" });
          await sleep(500);
          for (let index = 1; index <= action.text.length; index++) {
            if (!alive || mine !== run) return;
            setOptions({
              kind: "input",
              placeholder: action.placeholder,
              typed: action.text.slice(0, index),
            });
            await sleep(55 + (index % 3) * 20);
          }
          await sleep(300);
        } else if (action.t === "confirm") {
          setOptions({ kind: "confirm", pressed: false });
          await sleep(1500);
          if (!alive || mine !== run) return;
          setOptions({ kind: "confirm", pressed: true });
          await sleep(700);
          setOptions({ kind: "none" });
        } else {
          setCard({ view: "ticket", ...last, done: true });
          setOptions({ kind: "done" });
          await sleep(5200);
        }
      }
      if (alive && !reduce && mine === run) void play();
    }

    void play();
    return () => {
      alive = false;
      run++;
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[380px] lg:mx-0">
      <PhoneFrame>
        <ChatHeader typing={typing} />
        <Trail current={step} />
        <div
          className="scroll-thin flex-1 space-y-2.5 overflow-y-auto py-2 pr-1"
          aria-hidden="true"
        >
          {lines.map((line) => (
            <Bubble key={line.id} role={line.role}>
              {line.text}
            </Bubble>
          ))}
          {typing && <TypingDots />}
        </div>
        <div className="min-h-[92px] pt-2" aria-hidden="true">
          {options.kind === "chips" && (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${options.cols}, 1fr)` }}
            >
              {options.items.map(([label, sub], index) => (
                <span
                  key={label}
                  style={{ "--i": index } as React.CSSProperties}
                  className={cn(CHIP, options.pressed === index && "picked scale-[0.97]")}
                >
                  {label}
                  {sub && (
                    <span
                      className={cn(
                        "block text-[11px] font-normal",
                        options.pressed === index ? "text-white/80" : "text-slate7",
                      )}
                    >
                      {sub}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          {options.kind === "input" && (
            <div className="chip-in flex items-center gap-2">
              <span className="glass2 flex min-h-10 flex-1 items-center rounded-xl px-4 text-sm text-ink">
                {options.typed || <span className="text-slate7/60">{options.placeholder}</span>}
                <span className="ml-px inline-block h-4 w-px animate-pulse bg-brand" />
              </span>
              <span className="picked grid size-10 shrink-0 place-items-center rounded-xl">➤</span>
            </div>
          )}
          {options.kind === "confirm" && (
            <span
              className={cn(
                "chip-in picked block rounded-xl px-3 py-3 text-center text-sm font-medium",
                options.pressed && "scale-[0.97] brightness-110",
              )}
            >
              {options.pressed ? "Confirmando…" : "✓ Confirmar horário"}
            </span>
          )}
          {options.kind === "done" && (
            <div className="chip-in grid grid-cols-2 gap-2">
              <span className={CHIP}>📅 Salvar na agenda</span>
              <span className={CHIP}>↻ Marcar outro</span>
            </div>
          )}
        </div>
      </PhoneFrame>

      <CreamCard
        confetti={card.done}
        title={
          {
            services: "Serviços",
            days: "Próximos dias",
            slots: "Horários · qua 16",
            ticket: "Sua comanda",
          }[card.view]
        }
        badge={
          {
            services: "4 opções",
            days: "6 dias",
            slots: "10 livres",
            ticket: card.done ? "#A3F1C2" : "rascunho",
          }[card.view]
        }
      >
        {card.view === "services" && (
          <ul className="space-y-1">
            {SERVICES.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm",
                  item.id === COMBO?.id && "picked",
                )}
              >
                <span>
                  {item.label}
                  <span
                    className={cn(
                      "ml-1.5 text-xs",
                      item.id === COMBO?.id ? "text-white/80" : "text-cream-muted",
                    )}
                  >
                    {item.minutes} min
                  </span>
                </span>
                <span className="font-medium">R$ {item.price}</span>
              </li>
            ))}
          </ul>
        )}
        {card.view === "days" && (
          <ul className="space-y-1">
            {[
              ["ter 15", "7 livres", "hoje"],
              ["qua 16", "10 livres", "amanhã"],
              ["qui 17", "10 livres", ""],
              ["sex 18", "10 livres", ""],
              ["sáb 19", "9 livres", ""],
              ["seg 21", "10 livres", ""],
            ].map(([label, free, tag]) => (
              <li
                key={label}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm",
                  label === "qua 16" && "picked",
                )}
              >
                <span>
                  {label}
                  {tag && <span className="ml-1.5 text-xs opacity-70">{tag}</span>}
                </span>
                <span
                  className={cn("text-xs font-medium", label !== "qua 16" && "text-emerald-700")}
                >
                  {free}
                </span>
              </li>
            ))}
          </ul>
        )}
        {card.view === "slots" && (
          <div className="grid grid-cols-3 gap-1.5">
            {SLOTS.map((slot) => (
              <span
                key={slot}
                className={cn(
                  "rounded-lg border border-cream-ink/10 px-2 py-1.5 text-center text-xs font-medium",
                  slot === "14:00" && "picked",
                )}
              >
                {slot}
              </span>
            ))}
          </div>
        )}
        {card.view === "ticket" && COMBO && (
          <Ticket
            service={COMBO}
            when="qua, 16 de set"
            time="14:00"
            name={card.name}
            phone={card.phone}
            done={card.done}
          />
        )}
      </CreamCard>
    </div>
  );
}
