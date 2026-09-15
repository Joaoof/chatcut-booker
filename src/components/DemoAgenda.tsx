import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AgendaPanel,
  type Appointment,
  type NewBooking,
  type Status,
} from "@/components/AgendaPanel";
import { SERVICES, TIME_SLOTS } from "@/lib/booking.functions";
import { toISO, weekFrom } from "@/lib/dates";

/*
 * The team panel filled with made-up clients, for the landing page.
 * Everything the visitor does stays in memory.
 */

const NAMES = [
  "Marcos Vieira",
  "Rafael Souza",
  "João de Deus",
  "Pedro Lima",
  "Lucas Almeida",
  "Thiago Ramos",
  "Bruno Costa",
  "Felipe Nunes",
  "Caio Martins",
  "Diego Rocha",
  "André Batista",
  "Gustavo Reis",
];

/*  Small deterministic hash so each day shows a stable, different agenda.  */
function seedOf(iso: string) {
  let seed = 7;
  for (const char of iso) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647;
  return seed;
}

function sampleRows(iso: string): Appointment[] {
  const seed = seedOf(iso);
  const weekday = new Date(`${iso}T12:00:00`).getDay();
  if (weekday === 0) return [];
  const count = 4 + (seed % 4);
  /*  Seeded shuffle of the slot indexes, then keep the first `count`.  */
  const order = TIME_SLOTS.map((_, index) => index);
  let state = seed;
  for (let index = order.length - 1; index > 0; index--) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const swap = state % (index + 1);
    [order[index], order[swap]] = [order[swap] ?? 0, order[index] ?? 0];
  }
  const slots = order.slice(0, count);
  return [...slots]
    .sort((a, b) => a - b)
    .map((slotIndex, index) => {
      const service = SERVICES[(seed + index * 5) % SERVICES.length] ?? SERVICES[0];
      const name = NAMES[(seed + index * 3) % NAMES.length] ?? "Cliente";
      const suffix = String(1000 + ((seed * (index + 1)) % 9000)).padStart(4, "0");
      const status: Status =
        index === 1 ? "pendente" : index === count - 1 && count > 5 ? "cancelado" : "confirmado";
      return {
        id: `${iso}-${slotIndex}`,
        customer_name: name,
        phone: `(63) 9${String(8000 + ((seed + index) % 1999))}-${suffix}`,
        service: service.label,
        price: service.price,
        appointment_date: iso,
        appointment_time: TIME_SLOTS[slotIndex] ?? "08:00",
        status,
      };
    });
}

export function DemoAgenda() {
  const [today] = useState(() => toISO(new Date()));
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [extras, setExtras] = useState<Appointment[]>([]);

  /*  A short shimmer on every day change keeps the demo feeling live.  */
  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(id);
  }, [date]);

  const rowsFor = (iso: string) =>
    [...sampleRows(iso), ...extras.filter((row) => row.appointment_date === iso)].map((row) => ({
      ...row,
      status: overrides[row.id] ?? row.status,
    }));

  const rows = useMemo(rowsFor.bind(null, date), [date, overrides, extras]); // eslint-disable-line react-hooks/exhaustive-deps
  const occupancy = useMemo(
    () =>
      Object.fromEntries(
        weekFrom(today).map((iso) => [
          iso,
          rowsFor(iso).filter((row) => row.status !== "cancelado").length,
        ]),
      ),
    [today, overrides, extras], // eslint-disable-line react-hooks/exhaustive-deps
  );

  function setStatus(id: string, status: Status) {
    setOverrides((prev) => ({ ...prev, [id]: status }));
    toast.success(status === "cancelado" ? "Horário cancelado." : "Horário confirmado.");
  }

  async function create(booking: NewBooking) {
    const service = SERVICES.find((item) => item.label === booking.service);
    setExtras((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        customer_name: booking.name,
        phone: booking.phone,
        service: booking.service,
        price: service?.price ?? 0,
        appointment_date: date,
        appointment_time: booking.time,
        status: "confirmado",
      },
    ]);
    toast.success(`${booking.name} agendado às ${booking.time}.`);
    return true;
  }

  return (
    <AgendaPanel
      date={date}
      today={today}
      rows={rows}
      loading={loading}
      occupancy={occupancy}
      onDateChange={setDate}
      onRefresh={() => {
        setLoading(true);
        setTimeout(() => setLoading(false), 350);
      }}
      onStatusChange={setStatus}
      onCreate={create}
    />
  );
}
