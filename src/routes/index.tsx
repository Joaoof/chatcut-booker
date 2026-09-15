import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandHeader } from "@/components/BrandHeader";
import {
  SERVICES,
  TIME_SLOTS,
  createBooking,
  getTakenSlots,
} from "@/lib/booking.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vulcan Barber — agende seu corte pelo chat" },
      {
        name: "description",
        content:
          "Converse com o assistente da Vulcan Barber e reserve seu horário em segundos. Seg a sáb, 08:00 às 18:00.",
      },
      { property: "og:title", content: "Vulcan Barber — agende seu corte pelo chat" },
      {
        property: "og:description",
        content: "Escolha serviço, dia e horário conversando com nosso assistente.",
      },
    ],
  }),
  component: ChatBooking,
});

type Message = { id: string; role: "bot" | "user"; content: string };
type Step = "service" | "date" | "time" | "name" | "phone" | "confirm" | "done";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextWorkingDays(count: number) {
  const days: { iso: string; label: string; long: string }[] = [];
  const cursor = new Date();
  while (days.length < count) {
    if (cursor.getDay() !== 0) {
      days.push({
        iso: toISO(cursor),
        label: `${WEEKDAYS[cursor.getDay()]} · ${cursor.getDate()}`,
        long: `${WEEKDAYS[cursor.getDay()]}, ${cursor.getDate()} de ${MONTHS[cursor.getMonth()]}`,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

let seq = 0;
const nextId = () => `m${++seq}`;

function ChatBooking() {
  const takenSlotsFn = useServerFn(getTakenSlots);
  const createBookingFn = useServerFn(createBooking);

  const days = useMemo(() => nextWorkingDays(6), []);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nextId(),
      role: "bot",
      content: "E aí! 💈 Sou o assistente da Vulcan. Bora marcar seu horário?",
    },
    { id: nextId(), role: "bot", content: "Qual serviço você quer hoje?" },
  ]);
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<(typeof SERVICES)[number] | null>(null);
  const [day, setDay] = useState<(typeof days)[number] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, step]);

  useEffect(() => {
    if (step === "name" || step === "phone") inputRef.current?.focus();
  }, [step]);

  const push = (role: Message["role"], content: string) =>
    setMessages((prev) => [...prev, { id: nextId(), role, content }]);

  async function pickService(item: (typeof SERVICES)[number]) {
    setService(item);
    push("user", item.label);
    push("bot", `${item.label} sai por R$ ${item.price}. Qual dia fica melhor pra você?`);
    setStep("date");
  }

  async function pickDay(item: (typeof days)[number]) {
    setDay(item);
    push("user", item.long);
    setStep("time");
    setLoadingSlots(true);
    try {
      const result = await takenSlotsFn({ data: { date: item.iso } });
      setTaken(result);
      push("bot", "Show. Esses são os horários livres:");
    } catch {
      setTaken([]);
      push("bot", "Consegui abrir a agenda. Escolhe um horário:");
    } finally {
      setLoadingSlots(false);
    }
  }

  function pickTime(slot: string) {
    setTime(slot);
    push("user", slot);
    push("bot", "Fechado! Como é o seu nome?");
    setStep("name");
  }

  function submitDraft() {
    const value = draft.trim();
    if (!value) return;
    if (step === "name") {
      if (value.length < 2) return;
      setName(value);
      push("user", value);
      push("bot", `Prazer, ${value.split(" ")[0]}! Qual seu WhatsApp?`);
      setDraft("");
      setStep("phone");
      return;
    }
    if (step === "phone") {
      if (value.replace(/\D/g, "").length < 10) {
        toast.error("Coloque um número com DDD, tipo (11) 98765-4321");
        return;
      }
      setPhone(value);
      push("user", value);
      push("bot", "Tudo certo! Confere os dados e confirma pra mim 👇");
      setDraft("");
      setStep("confirm");
    }
  }

  async function confirm() {
    if (!service || !day || !time) return;
    setSaving(true);
    try {
      await createBookingFn({
        data: {
          name,
          phone,
          service: service.label,
          date: day.iso,
          time,
          transcript: messages.map((message) => ({ role: message.role, content: message.content })),
        },
      });
      push("bot", `Agendado! ${day.long} às ${time}. Te espero aqui 💈`);
      setStep("done");
      toast.success("Horário confirmado!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não consegui salvar agora.";
      toast.error(message);
      push("bot", `${message} Escolhe outro horário?`);
      setStep("time");
      if (day) {
        const result = await takenSlotsFn({ data: { date: day.iso } }).catch(() => []);
        setTaken(result);
      }
    } finally {
      setSaving(false);
    }
  }

  function restart() {
    seq = 0;
    setService(null);
    setDay(null);
    setTime(null);
    setName("");
    setPhone("");
    setDraft("");
    setStep("service");
    setMessages([
      { id: nextId(), role: "bot", content: "Bora marcar outro horário! Qual serviço?" },
    ]);
  }

  const freeSlots = TIME_SLOTS.filter((slot) => !taken.includes(slot));

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 size-[460px] rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 size-[300px] rounded-full bg-white/40 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <BrandHeader
          right={
            <Link
              to="/admin"
              className="glass2 hidden items-center gap-2 rounded-full px-4 py-2 sm:flex"
            >
              <span className="text-xs font-medium text-slate7">Painel</span>
              <span className="size-1 rounded-full bg-slate7/50" />
              <span className="text-xs font-semibold text-ink">Agenda do dia</span>
            </Link>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* CHATBOT */}
          <div className="glass flex h-[560px] flex-col rounded-3xl p-5">
            <div className="flex items-center gap-3 border-b border-ink/5 pb-4">
              <div className="grid size-10 place-items-center rounded-full bg-brand/90 font-display font-semibold text-brand-foreground">
                V
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">Vulcan · assistente</p>
                <p className="flex items-center gap-1 text-xs text-success">
                  <span className="size-1.5 rounded-full bg-success" /> online
                </p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-4 pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-in flex ${message.role === "user" ? "justify-end" : ""}`}
                >
                  <span
                    className={
                      message.role === "user"
                        ? "max-w-[75%] rounded-2xl rounded-br-sm bg-brand/15 px-4 py-2.5 text-sm text-ink"
                        : "glass2 max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-ink"
                    }
                  >
                    {message.content}
                  </span>
                </div>
              ))}

              {step === "confirm" && service && day && time && (
                <div className="chat-in glass2 rounded-2xl p-4">
                  <p className="text-[11px] font-medium tracking-widest text-slate7 uppercase">
                    Resumo
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
                    <span className="text-slate7">Serviço</span>
                    <span className="text-right font-medium text-ink">{service.label}</span>
                    <span className="text-slate7">Dia</span>
                    <span className="text-right font-medium text-ink">{day.long}</span>
                    <span className="text-slate7">Hora</span>
                    <span className="text-right font-medium text-ink">{time}</span>
                    <span className="text-slate7">Nome</span>
                    <span className="text-right font-medium text-ink">{name}</span>
                    <span className="text-slate7">WhatsApp</span>
                    <span className="text-right font-medium text-ink">{phone}</span>
                    <span className="text-slate7">Valor</span>
                    <span className="text-right font-medium text-ink">R$ {service.price}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              {step === "service" && (
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => pickService(item)}
                      className="lift glass2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {step === "date" && (
                <div className="grid grid-cols-3 gap-2">
                  {days.map((item) => (
                    <button
                      key={item.iso}
                      onClick={() => pickDay(item)}
                      className="lift glass2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {step === "time" && (
                <div className="grid grid-cols-4 gap-2">
                  {loadingSlots && (
                    <span className="col-span-4 text-sm text-slate7">Abrindo a agenda…</span>
                  )}
                  {!loadingSlots && freeSlots.length === 0 && (
                    <span className="col-span-4 text-sm text-slate7">
                      Esse dia lotou. Escolhe outro dia no chat.
                    </span>
                  )}
                  {!loadingSlots &&
                    freeSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => pickTime(slot)}
                        className="lift glass2 rounded-xl px-2 py-2.5 text-sm font-medium text-ink"
                      >
                        {slot}
                      </button>
                    ))}
                </div>
              )}

              {(step === "name" || step === "phone") && (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && submitDraft()}
                    placeholder={step === "name" ? "Seu nome" : "(11) 98765-4321"}
                    inputMode={step === "phone" ? "tel" : "text"}
                    className="glass2 flex-1 rounded-xl px-4 py-2.5 text-sm text-ink outline-none placeholder:text-slate7/60 focus:border-brand"
                  />
                  <button
                    onClick={submitDraft}
                    className="lift grid size-10 place-items-center rounded-xl bg-brand font-semibold text-brand-foreground"
                    aria-label="Enviar"
                  >
                    →
                  </button>
                </div>
              )}

              {step === "confirm" && (
                <button
                  onClick={confirm}
                  disabled={saving}
                  className="lift w-full rounded-xl bg-steel px-3 py-3 text-sm font-semibold text-brand-foreground disabled:opacity-60"
                >
                  {saving ? "Confirmando…" : "Confirmar agendamento"}
                </button>
              )}

              {step === "done" && (
                <button
                  onClick={restart}
                  className="lift glass2 w-full rounded-xl px-3 py-3 text-sm font-semibold text-ink"
                >
                  Marcar outro horário
                </button>
              )}
            </div>
          </div>

          {/* SERVIÇOS E DISPONIBILIDADE */}
          <div className="glass rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  {day ? `Horários · ${day.long}` : "Nossos serviços"}
                </h2>
                <p className="mt-0.5 text-xs text-slate7">Seg a sáb · 08:00 às 18:00</p>
              </div>
              <span className="glass2 rounded-full px-3 py-1.5 text-xs font-semibold text-ink">
                {day ? `${freeSlots.length} livres` : `${SERVICES.length} serviços`}
              </span>
            </div>

            {day ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {TIME_SLOTS.map((slot) => {
                  const busy = taken.includes(slot);
                  return (
                    <div
                      key={slot}
                      className={`glass2 rounded-2xl px-3 py-3 text-center ${busy ? "opacity-45" : ""}`}
                    >
                      <p className="font-display text-sm font-semibold text-ink">{slot}</p>
                      <p className="mt-0.5 text-[11px] text-slate7">{busy ? "ocupado" : "livre"}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {SERVICES.map((item) => (
                  <div
                    key={item.id}
                    className="glass2 flex items-center gap-3 rounded-2xl px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                      <p className="text-xs text-slate7">na cadeira do barbeiro</p>
                    </div>
                    <p className="font-display text-sm font-semibold text-ink">R$ {item.price}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="glass2 rounded-2xl p-3 text-center">
                <p className="font-display text-2xl font-semibold text-ink">10</p>
                <p className="mt-0.5 text-[11px] text-slate7">Horários por dia</p>
              </div>
              <div className="glass2 rounded-2xl p-3 text-center">
                <p className="font-display text-2xl font-semibold text-ink">6</p>
                <p className="mt-0.5 text-[11px] text-slate7">Dias na semana</p>
              </div>
              <div className="glass2 rounded-2xl p-3 text-center">
                <p className="font-display text-2xl font-semibold text-ink">1 min</p>
                <p className="mt-0.5 text-[11px] text-slate7">Pra agendar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
