import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, Check, RotateCcw, Send, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Bubble,
  CHIP,
  ChatHeader,
  CreamCard,
  PhoneFrame,
  ServiceIcon,
  Ticket,
  Trail,
  TypingDots,
  type Service,
} from "@/components/chat-ui";
import {
  SERVICES,
  TIME_SLOTS,
  createBooking,
  getTakenSlots,
  getWeekAvailability,
} from "@/lib/booking.functions";
import { maskPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "bot" | "user"; content: string };
type Step = "service" | "date" | "time" | "name" | "phone" | "confirm" | "done";
type Day = {
  iso: string;
  weekday: string;
  dayNumber: number;
  long: string;
  today: boolean;
  tomorrow: boolean;
};
type SlotState = "free" | "busy" | "past";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/*  "name" and "phone" share the "Você" stop on the trail.  */
const STEP_INDEX: Record<Step, number> = {
  service: 0,
  date: 1,
  time: 2,
  name: 3,
  phone: 3,
  confirm: 4,
  done: 5,
};
const STEP_AT_INDEX: Step[] = ["service", "date", "time", "name", "confirm"];

function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextWorkingDays(count: number) {
  const days: Day[] = [];
  const cursor = new Date();
  const todayISO = toISO(cursor);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = toISO(tomorrow);
  while (days.length < count) {
    if (cursor.getDay() !== 0) {
      const iso = toISO(cursor);
      days.push({
        iso,
        weekday: WEEKDAYS[cursor.getDay()] ?? "",
        dayNumber: cursor.getDate(),
        long: `${WEEKDAYS[cursor.getDay()]}, ${cursor.getDate()} de ${MONTHS[cursor.getMonth()]}`,
        today: iso === todayISO,
        tomorrow: iso === tomorrowISO,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function calendarUrl(service: Service, day: Day, time: string) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const startMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const endMinutes = startMinutes + service.minutes;
  const stamp = (minutes: number) =>
    `${day.iso.replace(/-/g, "")}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${service.label} · Vulcan Barber`,
    dates: `${stamp(startMinutes)}/${stamp(endMinutes)}`,
    details: `Agendado pelo chat da Vulcan Barber. Valor: R$ ${service.price}.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let seq = 0;
const nextId = () => `m${++seq}`;

/*
 * The real booking chat inside the phone, plus the cream card beside it.
 * `initialService` lets a service card on the landing page pre-answer step one.
 */
export function BookingChat({ initialService }: { initialService?: Service["id"] | undefined }) {
  const takenSlotsFn = useServerFn(getTakenSlots);
  const weekFn = useServerFn(getWeekAvailability);
  const createBookingFn = useServerFn(createBooking);

  const days = useMemo(() => nextWorkingDays(6), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<Service | null>(null);
  const [day, setDay] = useState<Day | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [weekTaken, setWeekTaken] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [nowHour, setNowHour] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sayToken = useRef(0);

  const push = (role: Message["role"], content: string) =>
    setMessages((prev) => [...prev, { id: nextId(), role, content }]);

  /*  Types each line out with a pause that scales with its length. Resolves false when cut short.  */
  async function botSay(...lines: string[]) {
    const token = ++sayToken.current;
    for (const line of lines) {
      setTyping(true);
      await wait(Math.min(1100, 380 + line.length * 14));
      if (sayToken.current !== token) return false;
      setTyping(false);
      push("bot", line);
      await wait(140);
    }
    return true;
  }

  useEffect(() => {
    setNowHour(new Date().getHours());
    const preset = SERVICES.find((item) => item.id === initialService);
    if (preset) {
      void botSay("E aí! 💈 Sou o assistente da Vulcan. Bora marcar seu horário?").then(
        (finished) => {
          if (finished) void pickService(preset);
        },
      );
    } else {
      void botSay(
        "E aí! 💈 Sou o assistente da Vulcan. Bora marcar seu horário?",
        "Qual serviço você quer hoje?",
      );
    }
    weekFn({ data: { dates: days.map((item) => item.iso) } })
      .then(setWeekTaken)
      .catch(() => setWeekTaken({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, step]);

  useEffect(() => {
    if (!typing && (step === "name" || step === "phone")) inputRef.current?.focus();
  }, [step, typing]);

  function slotState(item: Day, slot: string): SlotState {
    if (item.today && nowHour !== null && Number(slot.slice(0, 2)) <= nowHour) return "past";
    if (weekTaken[item.iso]?.includes(slot)) return "busy";
    return "free";
  }

  const freeCount = (item: Day) =>
    TIME_SLOTS.filter((slot) => slotState(item, slot) === "free").length;

  async function pickService(item: Service) {
    setService(item);
    push("user", item.label);
    setStep("date");
    await botSay(
      `${item.label} sai por R$ ${item.price} e leva uns ${item.minutes} min. Qual dia fica melhor pra você?`,
    );
  }

  async function pickDay(item: Day) {
    if (typing) return;
    setDay(item);
    push("user", item.long);
    setStep("time");
    setLoadingSlots(true);
    let taken = weekTaken[item.iso] ?? [];
    try {
      taken = await takenSlotsFn({ data: { date: item.iso } });
      setWeekTaken((prev) => ({ ...prev, [item.iso]: taken }));
    } catch {
      /*  Keep the week snapshot if the refresh fails.  */
    } finally {
      setLoadingSlots(false);
    }
    const free = TIME_SLOTS.filter(
      (slot) =>
        !taken.includes(slot) &&
        !(item.today && nowHour !== null && Number(slot.slice(0, 2)) <= nowHour),
    );
    if (free.length === 0) {
      setDay(null);
      setStep("date");
      await botSay(`${item.long} já lotou 😅 Consegue outro dia?`);
      return;
    }
    await botSay(
      free.length <= 3
        ? `Sobraram só ${free.length} horários nesse dia. Corre:`
        : "Show. Esses são os horários livres:",
    );
  }

  async function pickTime(slot: string) {
    if (typing) return;
    setTime(slot);
    push("user", slot);
    setStep("name");
    await botSay("Fechado! Como é o seu nome?");
  }

  async function submitDraft() {
    const value = draft.trim();
    if (!value || typing) return;
    if (step === "name") {
      if (value.length < 2) {
        toast.error("Me diz pelo menos duas letras do seu nome.");
        return;
      }
      setName(value);
      push("user", value);
      setDraft("");
      setStep("phone");
      await botSay(`Prazer, ${value.split(" ")[0]}! Qual seu WhatsApp? Mando o lembrete por lá.`);
      return;
    }
    if (step === "phone") {
      if (value.replace(/\D/g, "").length < 10) {
        toast.error("Coloque um número com DDD, tipo (11) 98765-4321");
        return;
      }
      setPhone(value);
      push("user", value);
      setDraft("");
      setStep("confirm");
      await botSay("Tudo certo! Confere a comanda e confirma pra mim 👇");
    }
  }

  async function confirm() {
    if (!service || !day || !time || saving) return;
    setSaving(true);
    try {
      const created = await createBookingFn({
        data: {
          name,
          phone,
          service: service.label,
          date: day.iso,
          time,
          transcript: messages.map((message) => ({ role: message.role, content: message.content })),
        },
      });
      setBookingId(created.id);
      setStep("done");
      toast.success("Horário confirmado!");
      await botSay(
        `Confirmado! ${day.long} às ${time}. Te espero aqui 💈`,
        "Se precisar, é só chamar de novo pra remarcar.",
      );
    } catch (error) {
      /*  Only the "slot just got taken" message is meant for the client.  */
      const taken = error instanceof Error && error.message.includes("acabou de ser reservado");
      const message = taken
        ? "Esse horário acabou de ser reservado por outra pessoa."
        : "Não consegui salvar o agendamento agora.";
      toast.error(message);
      setTime(null);
      setStep("time");
      const refreshed = await takenSlotsFn({ data: { date: day.iso } }).catch(() => []);
      setWeekTaken((prev) => ({ ...prev, [day.iso]: refreshed }));
      await botSay(`${message} Escolhe outro horário?`);
    } finally {
      setSaving(false);
    }
  }

  /*  Jump back on the trail; everything after the target is cleared.  */
  function goBack(target: Step) {
    if (saving || step === "done") return;
    sayToken.current++;
    setTyping(false);
    setDraft("");
    if (STEP_INDEX[target] <= STEP_INDEX.service) setService(null);
    if (STEP_INDEX[target] <= STEP_INDEX.date) setDay(null);
    if (STEP_INDEX[target] <= STEP_INDEX.time) setTime(null);
    if (STEP_INDEX[target] <= STEP_INDEX.name) {
      setName("");
      setPhone("");
    }
    setStep(target);
    const prompt: Record<Step, string> = {
      service: "Sem problema. Qual serviço você quer?",
      date: "Beleza. Qual dia fica melhor?",
      time: "Certo. Escolhe outro horário:",
      name: "Como é o seu nome?",
      phone: "Qual seu WhatsApp?",
      confirm: "Confere a comanda e confirma pra mim 👇",
      done: "",
    };
    void botSay(prompt[target]);
  }

  function restart() {
    sayToken.current++;
    seq = 0;
    setService(null);
    setDay(null);
    setTime(null);
    setName("");
    setPhone("");
    setDraft("");
    setBookingId(null);
    setStep("service");
    setMessages([]);
    void botSay("Bora marcar outro horário! Qual serviço?");
    weekFn({ data: { dates: days.map((item) => item.iso) } })
      .then(setWeekTaken)
      .catch(() => undefined);
  }

  const stepIndex = STEP_INDEX[step];
  const canGoBack = stepIndex > 0 && step !== "done" && !saving;
  const freeSlots = day ? TIME_SLOTS.filter((slot) => slotState(day, slot) === "free") : [];
  const showOptions = !typing;
  const backTarget: Step =
    step === "confirm" ? "phone" : (STEP_AT_INDEX[stepIndex - 1] ?? "service");
  const backLabel =
    step === "confirm"
      ? "Corrigir WhatsApp"
      : `Trocar ${(["serviço", "dia", "hora", "nome"][stepIndex - 1] ?? "").toString()}`;

  return (
    <div className="relative mx-auto w-full max-w-[380px] lg:mx-0">
      <PhoneFrame>
        <ChatHeader
          typing={typing}
          action={
            step !== "service" && step !== "done" ? (
              <button
                type="button"
                onClick={restart}
                className="focus-ring rounded-full p-2 text-slate7 transition-colors hover:bg-white/5 hover:text-ink"
                aria-label="Recomeçar conversa"
                title="Recomeçar"
              >
                <RotateCcw className="size-4" />
              </button>
            ) : undefined
          }
        />

        <Trail
          current={stepIndex}
          onJump={canGoBack ? (index) => goBack(STEP_AT_INDEX[index] ?? "service") : undefined}
        />

        <div
          ref={scrollRef}
          className="scroll-thin flex-1 space-y-2.5 overflow-y-auto py-2 pr-1"
          aria-live="polite"
        >
          {messages.map((message) => (
            <Bubble key={message.id} role={message.role}>
              {message.content}
            </Bubble>
          ))}
          {typing && <TypingDots />}
        </div>

        <div className="min-h-[92px] pt-2">
          {showOptions && step === "service" && (
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickService(item)}
                  style={{ "--i": index } as React.CSSProperties}
                  className="chip-in lift glass2 focus-ring flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left"
                >
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand/15 text-brand">
                    <ServiceIcon id={item.id} className="size-7" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm leading-tight font-medium text-ink">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-slate7">
                      R$ {item.price} · {item.minutes} min
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {showOptions && step === "date" && (
            <div className="grid grid-cols-3 gap-2">
              {days.map((item, index) => {
                const free = freeCount(item);
                return (
                  <button
                    key={item.iso}
                    type="button"
                    disabled={free === 0}
                    onClick={() => pickDay(item)}
                    style={{ "--i": index } as React.CSSProperties}
                    className="chip-in lift glass2 focus-ring relative rounded-xl px-2 py-2 text-center disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    {(item.today || item.tomorrow) && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-1.5 text-[9px] font-semibold tracking-wide text-cream-ink uppercase">
                        {item.today ? "hoje" : "amanhã"}
                      </span>
                    )}
                    <span className="block text-[11px] text-slate7">{item.weekday}</span>
                    <span className="block text-lg leading-tight font-medium text-ink">
                      {item.dayNumber}
                    </span>
                    <span
                      className={cn(
                        "block text-[10px]",
                        free === 0 ? "text-slate7" : free <= 3 ? "text-warning" : "text-success",
                      )}
                    >
                      {free === 0 ? "lotado" : `${free} livres`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {showOptions && step === "time" && (
            <div className="grid grid-cols-4 gap-2">
              {loadingSlots &&
                Array.from({ length: 8 }, (_, index) => (
                  <span key={index} className="shimmer h-10 rounded-xl" />
                ))}
              {!loadingSlots &&
                freeSlots.map((slot, index) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => pickTime(slot)}
                    style={{ "--i": index } as React.CSSProperties}
                    className={CHIP}
                  >
                    {slot}
                  </button>
                ))}
            </div>
          )}

          {showOptions && (step === "name" || step === "phone") && (
            <form
              className="chip-in flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void submitDraft();
              }}
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) =>
                  setDraft(step === "phone" ? maskPhone(event.target.value) : event.target.value)
                }
                placeholder={step === "name" ? "Seu nome" : "(11) 98765-4321"}
                inputMode={step === "phone" ? "tel" : "text"}
                autoComplete={step === "phone" ? "tel" : "name"}
                maxLength={step === "phone" ? 15 : 80}
                aria-label={step === "name" ? "Seu nome" : "Seu WhatsApp"}
                className="glass2 focus-ring flex-1 rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-slate7/60"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="lift picked focus-ring grid size-10 shrink-0 place-items-center rounded-xl disabled:opacity-50 disabled:hover:translate-y-0"
                aria-label="Enviar"
              >
                <Send className="size-4" />
              </button>
            </form>
          )}

          {showOptions && step === "confirm" && (
            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="chip-in lift picked focus-ring flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium disabled:opacity-70"
            >
              {saving ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Confirmando…
                </>
              ) : (
                <>
                  <Check className="size-4" strokeWidth={3} />
                  Confirmar horário
                </>
              )}
            </button>
          )}

          {showOptions && step === "done" && service && day && time && (
            <div className="chip-in grid grid-cols-2 gap-2">
              <a
                href={calendarUrl(service, day, time)}
                target="_blank"
                rel="noreferrer"
                className="lift glass2 focus-ring flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-ink"
              >
                <CalendarPlus className="size-4 text-brand" />
                Salvar na agenda
              </a>
              <button
                type="button"
                onClick={restart}
                className="lift glass2 focus-ring flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-ink"
              >
                <RotateCcw className="size-4 text-slate7" />
                Marcar outro
              </button>
            </div>
          )}

          {showOptions && canGoBack && (
            <button
              type="button"
              onClick={() => goBack(backTarget)}
              className="focus-ring mt-2 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-slate7 transition-colors hover:text-ink"
            >
              <Undo2 className="size-3" />
              {backLabel}
            </button>
          )}
        </div>
      </PhoneFrame>

      <CreamCard
        confetti={step === "done"}
        title={
          <>
            {step === "service" && "Serviços"}
            {step === "date" && "Próximos dias"}
            {step === "time" && day && `Horários · ${day.weekday} ${day.dayNumber}`}
            {stepIndex >= 3 && "Sua comanda"}
          </>
        }
        badge={
          <>
            {step === "service" && `${SERVICES.length} opções`}
            {step === "date" && "6 dias"}
            {step === "time" && `${freeSlots.length} livres`}
            {stepIndex >= 3 && (bookingId ? `#${bookingId.slice(0, 6).toUpperCase()}` : "rascunho")}
          </>
        }
      >
        {step === "service" && (
          <ul className="space-y-1">
            {SERVICES.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pickService(item)}
                  disabled={typing}
                  className="focus-ring flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-cream-ink/6"
                >
                  <span>
                    {item.label}
                    <span className="ml-1.5 text-xs text-cream-muted">{item.minutes} min</span>
                  </span>
                  <span className="font-medium">R$ {item.price}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {step === "date" && (
          <ul className="space-y-1">
            {days.map((item) => {
              const free = freeCount(item);
              return (
                <li key={item.iso}>
                  <button
                    type="button"
                    onClick={() => pickDay(item)}
                    disabled={typing || free === 0}
                    className="focus-ring flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-cream-ink/6 disabled:opacity-50"
                  >
                    <span className="capitalize">
                      {item.weekday} {item.dayNumber}
                      {item.today && <span className="ml-1.5 text-xs text-cream-muted">hoje</span>}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        free === 0 ? "text-cream-muted" : "text-emerald-700",
                      )}
                    >
                      {free === 0 ? "lotado" : `${free} livres`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {step === "time" && day && (
          <div className="grid grid-cols-3 gap-1.5">
            {TIME_SLOTS.map((slot) => {
              const state = loadingSlots ? "loading" : slotState(day, slot);
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={state !== "free" || typing}
                  onClick={() => pickTime(slot)}
                  className={cn(
                    "focus-ring rounded-lg border border-cream-ink/10 px-2 py-1.5 text-center text-xs font-medium transition-colors",
                    state === "free" && "hover:border-brand hover:bg-brand hover:text-white",
                    state === "busy" && "hatched text-cream-muted line-through opacity-70",
                    state === "past" && "text-cream-muted opacity-40",
                    state === "loading" && "animate-pulse text-transparent",
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        )}

        {stepIndex >= 3 && service && day && time && (
          <Ticket
            service={service}
            when={day.long}
            time={time}
            name={name || undefined}
            phone={phone || undefined}
            done={step === "done"}
          />
        )}
      </CreamCard>
    </div>
  );
}
