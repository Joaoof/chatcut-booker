import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AgendaPanel,
  type Appointment,
  type NewBooking,
  type Status,
} from "@/components/AgendaPanel";
import { BrandHeader } from "@/components/BrandHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  createBooking,
  getWeekAvailability,
  listAppointments,
  updateAppointmentStatus,
} from "@/lib/booking.functions";
import { toISO, weekFrom } from "@/lib/dates";

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

function AdminPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listAppointments);
  const statusFn = useServerFn(updateAppointmentStatus);
  const weekFn = useServerFn(getWeekAvailability);
  const createFn = useServerFn(createBooking);

  const [ready, setReady] = useState(false);
  const [today] = useState(() => toISO(new Date()));
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [occupancy, setOccupancy] = useState<Record<string, number>>({});
  const weekDates = useMemo(() => weekFrom(today), [today]);

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

  const loadWeek = useCallback(async () => {
    try {
      const taken = await weekFn({ data: { dates: weekDates } });
      setOccupancy(Object.fromEntries(weekDates.map((iso) => [iso, taken[iso]?.length ?? 0])));
    } catch {
      /*  The strip just keeps its last numbers.  */
    }
  }, [weekFn, weekDates]);

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

  useEffect(() => {
    if (ready) void loadWeek();
  }, [ready, loadWeek]);

  async function setStatus(id: string, status: Status) {
    const previous = rows;
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
    try {
      await statusFn({ data: { id, status } });
      toast.success(status === "cancelado" ? "Horário cancelado." : "Horário confirmado.");
      void loadWeek();
    } catch {
      setRows(previous);
      toast.error("Não consegui atualizar esse agendamento.");
    }
  }

  async function create(booking: NewBooking) {
    try {
      await createFn({ data: { ...booking, date } });
      toast.success(`${booking.name} agendado às ${booking.time}.`);
      void load(date);
      void loadWeek();
      return true;
    } catch (error) {
      const taken = error instanceof Error && error.message.includes("acabou de ser reservado");
      toast.error(taken ? "Esse horário acabou de ser ocupado." : "Não consegui salvar agora.");
      return false;
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
      <div className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <BrandHeader
          right={
            <div className="flex items-center gap-2">
              <Link
                to="/agendar"
                className="lift glass2 focus-ring hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-ink sm:flex"
              >
                <MessageCircle className="size-3.5 text-slate7" />
                Abrir chat
              </Link>
              <button
                onClick={signOut}
                className="lift glass2 focus-ring flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-ink"
              >
                <LogOut className="size-3.5 text-slate7" />
                Sair
              </button>
            </div>
          }
        />
        <AgendaPanel
          date={date}
          today={today}
          rows={rows}
          loading={loading}
          occupancy={occupancy}
          onDateChange={setDate}
          onRefresh={() => {
            void load(date);
            void loadWeek();
          }}
          onStatusChange={(id, status) => void setStatus(id, status)}
          onCreate={create}
        />
      </div>
    </div>
  );
}
