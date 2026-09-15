import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BrandHeader } from "@/components/BrandHeader";
import { supabase } from "@/integrations/supabase/client";
import { listAppointments, updateAppointmentStatus } from "@/lib/booking.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel de agendamentos — Vulcan Barber" },
      {
        name: "description",
        content: "Agenda do dia da Vulcan Barber: clientes, telefones, serviços e faturamento.",
      },
      { property: "og:title", content: "Painel de agendamentos — Vulcan Barber" },
      { property: "og:description", content: "Agenda do dia, clientes e faturamento." },
    ],
  }),
  component: AdminPage,
});

type Appointment = {
  id: string;
  customer_name: string;
  phone: string;
  service: string;
  price: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
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

function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  confirmado: { dot: "bg-success", text: "text-success", label: "Confirmado" },
  pendente: { dot: "bg-gold", text: "text-warning", label: "Pendente" },
  cancelado: { dot: "bg-slate7/40", text: "text-slate7", label: "Cancelado" },
};

function AdminPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listAppointments);
  const statusFn = useServerFn(updateAppointmentStatus);

  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(() => toISO(new Date()));
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (day: string) => {
      setLoading(true);
      try {
        const result = await listFn({ data: { date: day } });
        setRows(result as Appointment[]);
      } catch {
        toast.error("Não consegui carregar a agenda.");
      } finally {
        setLoading(false);
      }
    },
    [listFn],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  useEffect(() => {
    if (ready) void load(date);
  }, [ready, date, load]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.status !== "cancelado");
    return {
      count: active.length,
      revenue: active.reduce((total, row) => total + Number(row.price), 0),
      confirmed: rows.filter((row) => row.status === "confirmado").length,
    };
  }, [rows]);

  const pretty = useMemo(() => {
    const parts = date.split("-").map(Number);
    const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
    return `${WEEKDAYS[parsed.getDay()]}, ${parsed.getDate()} de ${MONTHS[parsed.getMonth()]}`;
  }, [date]);

  async function setStatus(id: string, status: "confirmado" | "cancelado") {
    try {
      await statusFn({ data: { id, status } });
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
    } catch {
      toast.error("Não consegui atualizar esse agendamento.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate7">Carregando…</div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 size-[460px] rounded-full bg-gold/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <BrandHeader
          right={
            <button onClick={signOut} className="glass2 rounded-full px-4 py-2 text-xs font-semibold text-ink">
              Sair
            </button>
          }
        />

        <div className="glass rounded-3xl p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Agenda do dia</h2>
              <p className="mt-0.5 text-xs text-slate7">
                {pretty} · {rows.length} registros
              </p>
            </div>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="glass2 rounded-full px-4 py-1.5 text-xs font-medium text-ink outline-none"
            />
          </div>

          <div className="relative space-y-2 pl-5">
            <div className="absolute top-2 bottom-2 left-[7px] w-px bg-ink/10" />

            {loading && <p className="text-sm text-slate7">Carregando agenda…</p>}
            {!loading && rows.length === 0 && (
              <p className="text-sm text-slate7">Nenhum agendamento nesse dia ainda.</p>
            )}

            {rows.map((row) => {
              const style = STATUS_STYLE[row.status] ?? STATUS_STYLE.confirmado;
              return (
                <div
                  key={row.id}
                  className="glass2 relative flex items-center gap-3 rounded-2xl px-4 py-3"
                >
                  <span
                    className={`absolute -left-[17px] size-3 rounded-full ring-4 ring-ink/5 ${style.dot}`}
                  />
                  <div className="w-14 font-display text-xs font-semibold text-ink">
                    {row.appointment_time}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{row.customer_name}</p>
                    <p className="text-xs text-slate7">
                      {row.service} · {row.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate7">R$ {Number(row.price).toFixed(0)}</p>
                    <span className={`text-[11px] font-semibold ${style.text}`}>{style.label}</span>
                  </div>
                  <div className="ml-2 flex gap-1">
                    {row.status !== "confirmado" && (
                      <button
                        onClick={() => setStatus(row.id, "confirmado")}
                        className="glass2 rounded-lg px-2.5 py-1 text-[11px] font-medium text-ink"
                      >
                        Confirmar
                      </button>
                    )}
                    {row.status !== "cancelado" && (
                      <button
                        onClick={() => setStatus(row.id, "cancelado")}
                        className="glass2 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate7"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="glass2 rounded-2xl p-3 text-center">
              <p className="font-display text-2xl font-semibold text-ink">{stats.count}</p>
              <p className="mt-0.5 text-[11px] text-slate7">Agendados</p>
            </div>
            <div className="glass2 rounded-2xl p-3 text-center">
              <p className="font-display text-2xl font-semibold text-ink">R$ {stats.revenue}</p>
              <p className="mt-0.5 text-[11px] text-slate7">Faturamento</p>
            </div>
            <div className="glass2 rounded-2xl p-3 text-center">
              <p className="font-display text-2xl font-semibold text-ink">{stats.confirmed}</p>
              <p className="mt-0.5 text-[11px] text-slate7">Confirmados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
