import { createFileRoute, Link } from "@tanstack/react-router";

import { BookingChat } from "@/components/BookingChat";
import { BrandHeader } from "@/components/BrandHeader";
import { SERVICES } from "@/lib/booking.functions";

type BookingSearch = { servico?: string };

export const Route = createFileRoute("/agendar")({
  validateSearch: (search: Record<string, unknown>): BookingSearch => {
    const servico = search["servico"];
    return typeof servico === "string" ? { servico } : {};
  },
  head: () => ({
    meta: [
      { title: "Agendar horário — Vulcan Barber" },
      {
        name: "description",
        content: "Converse com o assistente e reserve seu corte em menos de um minuto.",
      },
      { property: "og:title", content: "Agendar horário — Vulcan Barber" },
      { property: "og:description", content: "Escolha serviço, dia e horário pelo chat." },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { servico } = Route.useSearch();
  const initialService = SERVICES.find((item) => item.id === servico)?.id;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <BrandHeader
          right={
            <>
              <Link
                to="/admin"
                className="focus-ring hidden rounded-full px-2 text-sm text-ink/85 transition-colors hover:text-ink sm:block"
              >
                Painel
              </Link>
              <Link
                to="/"
                className="lift glass2 focus-ring rounded-full px-5 py-2.5 text-sm font-medium text-ink"
              >
                Início
              </Link>
            </>
          }
        />

        <div className="mx-auto mb-8 max-w-xl text-center">
          <h1 className="text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
            Agende seu horário
          </h1>
          <p className="mt-3 text-lg font-light text-ink/80">
            Responda ao assistente e o horário fica reservado só pra você.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-[380px] lg:mr-[236px]">
            <BookingChat initialService={initialService} />
          </div>
        </div>
      </div>
    </div>
  );
}
