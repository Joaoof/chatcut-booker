import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageCircle,
  Plus,
  RotateCcw,
  Scissors,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SERVICES, TIME_SLOTS } from "@/lib/booking.functions";
import { fromISO, shiftISO, weekFrom } from "@/lib/dates";
import { maskPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export type Appointment = {
  id: string;
  customer_name: string;
  phone: string;
  service: string;
  price: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

export type Status = "confirmado" | "pendente" | "cancelado";
export type NewBooking = { name: string; phone: string; service: string; time: string };
type Filter = "todos" | Status;

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const STATUS_STYLE: Record<Status, { dot: string; text: string; label: string }> = {
  confirmado: { dot: "bg-success", text: "text-success", label: "Confirmado" },
  pendente: { dot: "bg-gold", text: "text-warning", label: "Pendente" },
  cancelado: { dot: "bg-slate7/40", text: "text-slate7", label: "Cancelado" },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "confirmado", label: "Confirmados" },
  { key: "pendente", label: "Pendentes" },
  { key: "cancelado", label: "Cancelados" },
];

function isStatus(value: string): value is Status {
  return value === "confirmado" || value === "pendente" || value === "cancelado";
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

const minutesOf = (slot: string) => Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3, 5));

/*
 * The team's day view: week strip, totals, day navigation, status filters,
 * the hour-by-hour timeline and a manual booking dialog. Data comes from
 * the parent, so the same panel serves the real admin page and the demo.
 */
export function AgendaPanel({
  date,
  today,
  rows,
  loading,
  occupancy,
  onDateChange,
  onRefresh,
  onStatusChange,
  onCreate,
}: {
  date: string;
  today: string;
  rows: Appointment[];
  loading: boolean;
  occupancy: Record<string, number>;
  onDateChange: (iso: string) => void;
  onRefresh: () => void;
  onStatusChange: (id: string, status: Status) => void;
  onCreate: (booking: NewBooking) => Promise<boolean>;
}) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  /*  "Agora" marker follows the clock while the panel is open.  */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const isToday = date === today;
  const active = useMemo(() => rows.filter((row) => row.status !== "cancelado"), [rows]);

  const stats = useMemo(() => {
    const confirmed = rows.filter((row) => row.status === "confirmado");
    return {
      count: active.length,
      confirmed: confirmed.length,
      pending: rows.filter((row) => row.status === "pendente").length,
      cancelled: rows.filter((row) => row.status === "cancelado").length,
      revenue: active.reduce((total, row) => total + Number(row.price), 0),
      confirmedRevenue: confirmed.reduce((total, row) => total + Number(row.price), 0),
      free: TIME_SLOTS.filter((slot) => !active.some((row) => row.appointment_time === slot))
        .length,
      occupancy: Math.round((active.length / TIME_SLOTS.length) * 100),
    };
  }, [rows, active]);

  /*  The next client to walk in: after the clock today, first of the day otherwise.  */
  const next = useMemo(() => {
    const sorted = [...active].sort(
      (a, b) => minutesOf(a.appointment_time) - minutesOf(b.appointment_time),
    );
    if (isToday && nowMinutes !== null) {
      return sorted.find((row) => minutesOf(row.appointment_time) + 59 >= nowMinutes) ?? null;
    }
    return sorted[0] ?? null;
  }, [active, isToday, nowMinutes]);

  const pretty = useMemo(() => {
    const parsed = fromISO(date);
    return `${WEEKDAYS[parsed.getDay()]}, ${parsed.getDate()} de ${MONTHS[parsed.getMonth()]}`;
  }, [date]);

  /*  Every slot of the day, with any off-grid times appended at the end.  */
  const timeline = useMemo(() => {
    const visible = rows.filter((row) => filter === "todos" || row.status === filter);
    const extra = [...new Set(visible.map((row) => row.appointment_time))]
      .filter((slot) => !TIME_SLOTS.includes(slot))
      .sort();
    return [...TIME_SLOTS, ...extra].map((slot) => ({
      slot,
      items: visible.filter((row) => row.appointment_time === slot),
    }));
  }, [rows, filter]);

  const freeSlots = TIME_SLOTS.filter(
    (slot) => !active.some((row) => row.appointment_time === slot),
  );
  const counts = {
    todos: rows.length,
    confirmado: stats.confirmed,
    pendente: stats.pending,
    cancelado: stats.cancelled,
  };

  return (
    <>
      {/* WEEK STRIP */}
      <div className="mb-4 grid grid-cols-7 gap-2">
        {weekFrom(today).map((iso) => {
          const parsed = fromISO(iso);
          const closed = parsed.getDay() === 0;
          const busy = occupancy[iso] ?? 0;
          const selected = iso === date;
          return (
            <button
              key={iso}
              type="button"
              disabled={closed}
              onClick={() => onDateChange(iso)}
              className={cn(
                "lift focus-ring rounded-2xl px-2 py-2.5 text-center transition-colors",
                selected ? "picked" : "glass2",
                closed && "cursor-not-allowed opacity-40 hover:translate-y-0",
              )}
            >
              <span
                className={cn(
                  "block text-[10px] font-medium uppercase",
                  selected ? "text-white/80" : "text-slate7",
                )}
              >
                {iso === today ? "hoje" : WEEKDAYS_SHORT[parsed.getDay()]}
              </span>
              <span className="block text-lg leading-tight font-medium">{parsed.getDate()}</span>
              <span
                className={cn(
                  "mx-auto mt-1.5 block h-1 w-full max-w-10 overflow-hidden rounded-full",
                  selected ? "bg-white/25" : "bg-line",
                )}
              >
                <span
                  className={cn("block h-full rounded-full", selected ? "bg-white" : "bg-brand")}
                  style={{ width: `${Math.min(100, (busy / TIME_SLOTS.length) * 100)}%` }}
                />
              </span>
              <span
                className={cn("mt-1 block text-[10px]", selected ? "text-white/80" : "text-slate7")}
              >
                {closed ? "fechado" : `${busy}/${TIME_SLOTS.length}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* STATS */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          className="glass chip-in rounded-2xl px-4 py-3"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate7 uppercase">
            <Scissors className="size-3.5" /> Agendados
          </p>
          <p className="count-in mt-1 text-2xl font-medium text-ink">
            {loading ? "—" : stats.count}
          </p>
          <p className="mt-0.5 text-xs text-slate7">
            {loading ? " " : `${stats.confirmed} confirmados · ${stats.pending} pendentes`}
          </p>
        </div>
        <div
          className="glass chip-in rounded-2xl px-4 py-3"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate7 uppercase">
            <Wallet className="size-3.5" /> Faturamento previsto
          </p>
          <p className="count-in mt-1 text-2xl font-medium text-ink">
            {loading ? "—" : `R$ ${stats.revenue}`}
          </p>
          <p className="mt-0.5 text-xs text-slate7">
            {loading ? " " : `R$ ${stats.confirmedRevenue} já confirmado`}
          </p>
        </div>
        <div
          className="glass chip-in rounded-2xl px-4 py-3"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate7 uppercase">
            <Clock3 className="size-3.5" /> Ocupação
          </p>
          <p className="count-in mt-1 text-2xl font-medium text-ink">
            {loading ? "—" : `${stats.occupancy}%`}
          </p>
          <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${loading ? 0 : stats.occupancy}%` }}
            />
          </span>
          <p className="mt-1 text-xs text-slate7">
            {loading ? " " : `${stats.free} horários livres`}
          </p>
        </div>
        <div
          className="glass chip-in rounded-2xl px-4 py-3"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate7 uppercase">
            <UserRound className="size-3.5" /> Próximo cliente
          </p>
          {loading ? (
            <p className="count-in mt-1 text-2xl font-medium text-ink">—</p>
          ) : next ? (
            <>
              <p className="count-in mt-1 truncate text-2xl font-medium text-ink">
                {next.appointment_time}
                <span className="ml-2 text-base font-normal">{next.customer_name}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-slate7">{next.service}</p>
            </>
          ) : (
            <>
              <p className="count-in mt-1 text-2xl font-medium text-ink">Livre</p>
              <p className="mt-0.5 text-xs text-slate7">Nenhum cliente a caminho</p>
            </>
          )}
        </div>
      </div>

      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDateChange(shiftISO(date, -1))}
              className="lift glass2 focus-ring grid size-9 place-items-center rounded-full text-ink"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onDateChange(shiftISO(date, 1))}
              className="lift glass2 focus-ring grid size-9 place-items-center rounded-full text-ink"
              aria-label="Próximo dia"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="ml-1">
              <h2 className="text-lg leading-tight font-medium text-ink first-letter:uppercase">
                {pretty}
              </h2>
              <p className="text-xs text-slate7">
                {isToday ? "Hoje" : "Agenda do dia"} · {rows.length}{" "}
                {rows.length === 1 ? "registro" : "registros"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isToday && (
              <button
                type="button"
                onClick={() => onDateChange(today)}
                className="lift glass2 focus-ring rounded-full px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Hoje
              </button>
            )}
            <input
              type="date"
              value={date}
              onChange={(event) => event.target.value && onDateChange(event.target.value)}
              className="glass2 focus-ring rounded-full px-4 py-1.5 text-xs font-medium text-ink"
              aria-label="Escolher dia"
            />
            <button
              type="button"
              onClick={onRefresh}
              className="lift glass2 focus-ring grid size-9 place-items-center rounded-full text-ink"
              aria-label="Atualizar"
              title="Atualizar"
            >
              <RotateCcw className={cn("size-4", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={freeSlots.length === 0}
              className="lift picked focus-ring flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              Agendar cliente
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por status">
          {FILTERS.map((item) => {
            const selected = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  selected ? "picked" : "glass2 text-ink hover:bg-white/10",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-semibold",
                    selected ? "bg-white/25" : "bg-ink/5 text-slate7",
                  )}
                >
                  {counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative space-y-1.5 pl-5">
          <div className="absolute top-2 bottom-2 left-[7px] w-px bg-line" />

          {loading &&
            Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="shimmer h-14 rounded-2xl" />
            ))}

          {!loading && rows.length === 0 && (
            <div className="glass2 rounded-2xl px-5 py-8 text-center">
              <Scissors className="mx-auto size-6 text-slate7/60" />
              <p className="mt-3 text-sm font-medium text-ink">Nenhum agendamento nesse dia</p>
              <p className="mt-1 text-xs text-slate7">
                O chat continua aberto pra receber clientes.
              </p>
              <Link
                to="/agendar"
                className="lift picked focus-ring mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                <MessageCircle className="size-3.5" />
                Abrir chat
              </Link>
            </div>
          )}

          {!loading &&
            rows.length > 0 &&
            timeline.map(({ slot, items }, index) => {
              const slotMinutes = minutesOf(slot);
              const nextSlot = timeline[index + 1];
              const nextMinutes = nextSlot ? minutesOf(nextSlot.slot) : Number.POSITIVE_INFINITY;
              const showNow =
                isToday &&
                nowMinutes !== null &&
                nowMinutes >= slotMinutes &&
                nowMinutes < nextMinutes;
              if (items.length === 0 && filter !== "todos") return null;
              return (
                <div
                  key={slot}
                  style={{ "--i": index } as React.CSSProperties}
                  className="row-in relative"
                >
                  {items.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-2.5">
                      <span className="absolute -left-[15px] size-2 rounded-full border border-line bg-surface" />
                      <span className="w-14 text-xs font-semibold text-slate7/70">{slot}</span>
                      <span className="text-xs text-slate7/60">livre</span>
                    </div>
                  ) : (
                    items.map((row) => {
                      const style = STATUS_STYLE[isStatus(row.status) ? row.status : "confirmado"];
                      const cancelled = row.status === "cancelado";
                      const upcoming = next?.id === row.id;
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            "glass2 relative mb-1.5 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all last:mb-0",
                            cancelled && "opacity-60",
                            upcoming && "border-brand/60",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute -left-[17px] size-3 rounded-full ring-4 ring-white/5 transition-colors",
                              style.dot,
                            )}
                          />
                          <div className="w-14 text-xs font-semibold text-ink">
                            {row.appointment_time}
                            {upcoming && (
                              <span className="mt-0.5 block text-[9px] font-semibold tracking-wide text-brand uppercase">
                                próximo
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "truncate text-sm font-medium text-ink",
                                cancelled && "line-through",
                              )}
                            >
                              {row.customer_name}
                            </p>
                            <p className="truncate text-xs text-slate7">
                              {row.service} ·{" "}
                              <a
                                href={whatsappUrl(row.phone)}
                                target="_blank"
                                rel="noreferrer"
                                className="focus-ring rounded font-medium text-brand hover:underline"
                                title="Chamar no WhatsApp"
                              >
                                {row.phone}
                              </a>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate7">R$ {Number(row.price).toFixed(0)}</p>
                            <span className={cn("text-[11px] font-semibold", style.text)}>
                              {style.label}
                            </span>
                          </div>
                          <div className="ml-1 flex gap-1">
                            {row.status !== "confirmado" && (
                              <button
                                type="button"
                                onClick={() => onStatusChange(row.id, "confirmado")}
                                className="lift glass2 focus-ring rounded-lg px-2.5 py-1 text-[11px] font-medium text-ink"
                              >
                                Confirmar
                              </button>
                            )}
                            {row.status !== "cancelado" && (
                              <button
                                type="button"
                                onClick={() => onStatusChange(row.id, "cancelado")}
                                className="lift glass2 focus-ring rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate7"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {showNow && (
                    <div className="pointer-events-none absolute right-0 -bottom-[5px] left-0 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-brand pulse-ring" />
                      <span className="h-px flex-1 bg-brand/60" />
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground">
                        agora
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <NewBookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dateLabel={pretty}
        freeSlots={freeSlots}
        onCreate={onCreate}
      />
    </>
  );
}

/*  Walk-in or phone booking entered by the team.  */
function NewBookingDialog({
  open,
  onOpenChange,
  dateLabel,
  freeSlots,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  freeSlots: string[];
  onCreate: (booking: NewBooking) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<string>(SERVICES[0]?.label ?? "");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const slot = time && freeSlots.includes(time) ? time : (freeSlots[0] ?? "");
  const valid = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10 && slot !== "";
  const field =
    "glass2 focus-ring w-full rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-slate7/60";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const ok = await onCreate({ name: name.trim(), phone, service, time: slot });
    setSaving(false);
    if (ok) {
      setName("");
      setPhone("");
      setTime("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-line bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-ink">Agendar cliente</DialogTitle>
          <DialogDescription className="text-slate7 first-letter:uppercase">
            {dateLabel}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do cliente"
            autoComplete="off"
            maxLength={80}
            aria-label="Nome do cliente"
            className={field}
          />
          <input
            value={phone}
            onChange={(event) => setPhone(maskPhone(event.target.value))}
            placeholder="(11) 98765-4321"
            inputMode="tel"
            maxLength={15}
            aria-label="WhatsApp do cliente"
            className={field}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={service}
              onChange={(event) => setService(event.target.value)}
              aria-label="Serviço"
              className={field}
            >
              {SERVICES.map((item) => (
                <option key={item.id} value={item.label}>
                  {item.label} · R$ {item.price}
                </option>
              ))}
            </select>
            <select
              value={slot}
              onChange={(event) => setTime(event.target.value)}
              aria-label="Horário"
              className={field}
            >
              {freeSlots.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!valid || saving}
            className="lift picked focus-ring flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? "Salvando…" : "Salvar agendamento"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
