import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SERVICES = [
  { id: "corte", label: "Corte", price: 45, minutes: 40, blurb: "Máquina, tesoura e acabamento" },
  { id: "barba", label: "Barba", price: 50, minutes: 30, blurb: "Toalha quente e navalha" },
  { id: "corte-barba", label: "Corte + Barba", price: 85, minutes: 60, blurb: "O combo completo" },
  { id: "sobrancelha", label: "Sobrancelha", price: 25, minutes: 15, blurb: "Design na navalha" },
] as const;

export const TIME_SLOTS = [
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

const DateInput = z.object({ date: z.string().min(10) });

export const getTakenSlots = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => DateInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", data.date)
      .neq("status", "cancelado");

    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => row.appointment_time);
  });

const DatesInput = z.object({ dates: z.array(z.string().min(10)).min(1).max(14) });

/*  Taken times for several days at once, keyed by ISO date.  */
export const getWeekAvailability = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => DatesInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("appointments")
      .select("appointment_date, appointment_time")
      .in("appointment_date", data.dates)
      .neq("status", "cancelado");

    if (error) throw new Error(error.message);

    const taken: Record<string, string[]> = {};
    for (const row of rows ?? []) {
      (taken[row.appointment_date] ??= []).push(row.appointment_time);
    }
    return taken;
  });

const BookingInput = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(8).max(25),
  service: z.string().min(2),
  date: z.string().min(10),
  time: z.string().min(4),
  transcript: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BookingInput.parse(data))
  .handler(async ({ data }) => {
    const service = SERVICES.find((item) => item.label === data.service);
    if (!service) throw new Error("Serviço inválido");
    if (!TIME_SLOTS.includes(data.time)) throw new Error("Horário inválido");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        customer_name: data.name.trim(),
        phone: data.phone.trim(),
        service: service.label,
        price: service.price,
        appointment_date: data.date,
        appointment_time: data.time,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505" || error.code === "23P01" || error.code === "23514") {
        throw new Error("Esse horário acabou de ser reservado. Escolha outro.");
      }
      if (error.code === "23505" || error.message.includes("duplicate")) {
        throw new Error("Esse horário acabou de ser reservado. Escolha outro.");
      }
      throw new Error(error.message);
    }

    if (data.transcript.length > 0) {
      const sessionId = created.id;
      const { error: chatError } = await supabaseAdmin.from("chat_messages").insert(
        data.transcript.map((message) => ({
          session_id: sessionId,
          role: message.role,
          content: message.content,
        })),
      );
      if (chatError) console.error("[chat_messages]", chatError.message);
    }

    return { id: created.id, price: service.price };
  });

export const listAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", data.date)
      .order("appointment_time", { ascending: true });

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["confirmado", "pendente", "cancelado"]),
});

export const updateAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => StatusInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("appointments")
      .update({ status: data.status })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
