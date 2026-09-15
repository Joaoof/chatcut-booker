import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BellOff,
  CalendarDays,
  CalendarX,
  Check,
  ChevronDown,
  CircleCheck,
  Headset,
  Link2,
  MessageCircle,
  MessageSquareWarning,
  Phone,
  Share2,
  ShieldCheck,
  Smartphone,
  Store,
  Zap,
} from "lucide-react";

import { BarberPole } from "@/components/BarberPole";
import { BrandHeader } from "@/components/BrandHeader";
import { ChatDemo } from "@/components/ChatDemo";
import { DemoAgenda } from "@/components/DemoAgenda";
import { Mustache } from "@/components/Mustache";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Corte na Hora — agendamento por chat para barbearias" },
      {
        name: "description",
        content:
          "Seu cliente conversa com o assistente, escolhe o horário livre e recebe a confirmação. Sem ida e volta no WhatsApp, sem horário duplicado. Planos a partir de R$ 49,90/mês.",
      },
      { property: "og:title", content: "Corte na Hora — agendamento por chat para barbearias" },
      {
        property: "og:description",
        content: "A barbearia agenda sozinha, 24h, pelo chat. Você só corta.",
      },
    ],
  }),
  component: Landing,
});

/*
 * Sales contact. Fill in the WhatsApp number (digits only, with country code)
 * and every "quero esse plano" button opens a conversation there; until then
 * they fall back to e-mail.
 */
const CONTACT = {
  whatsapp: "5563991021043",
  email: "joaodeus400@gmail.com",
};

function contactUrl(plan: string) {
  const text = `Olá! Quero o plano ${plan} do Corte na Hora para a minha barbearia.`;
  if (CONTACT.whatsapp) {
    return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
  }
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Corte na Hora · plano ${plan}`)}&body=${encodeURIComponent(text)}`;
}

const MONTHLY = 69.9;
const YEARLY_PER_MONTH = 49.9;
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PLANS = [
  {
    id: "mensal",
    name: "Mensal",
    price: MONTHLY,
    per: "/mês",
    note: "Sem fidelidade. Cancele quando quiser.",
    highlight: false,
  },
  {
    id: "anual",
    name: "Anual",
    price: YEARLY_PER_MONTH,
    per: "/mês",
    note: `${money(YEARLY_PER_MONTH * 12)} cobrado uma vez por ano. Você economiza ${money((MONTHLY - YEARLY_PER_MONTH) * 12)}.`,
    highlight: true,
  },
];

const INCLUDED = [
  "Chat de agendamento no seu link exclusivo",
  "Serviços, preços e horários da sua barbearia",
  "Painel com a agenda do dia e status de cada cliente",
  "WhatsApp do cliente em um toque",
  "Horário duplicado bloqueado pelo sistema",
  "Suporte pelo WhatsApp e atualizações incluídas",
];

const FAQ = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. O chat abre num link. Você coloca esse link no Instagram, no WhatsApp e no Google, e o cliente agenda pelo celular.",
  },
  {
    q: "E se dois clientes marcarem o mesmo horário?",
    a: "Não acontece. O sistema só mostra horários livres e trava o horário no momento em que o cliente confirma. Se alguém tentar o mesmo minuto, recebe outra opção na hora.",
  },
  {
    q: "Como eu vejo os agendamentos?",
    a: "No painel da equipe, com login só para você. A agenda do dia aparece hora a hora, com nome, serviço e o WhatsApp do cliente. Você confirma ou cancela em um toque.",
  },
  {
    q: "Funciona com mais de um barbeiro?",
    a: "Hoje o chat trabalha com uma agenda por barbearia. Se você tem mais cadeiras, fala com a gente antes de fechar que montamos do jeito certo.",
  },
  {
    q: "Posso cancelar?",
    a: "No plano mensal, a qualquer momento, sem multa. No anual, o valor já vem com desconto e vale por 12 meses.",
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <BrandHeader
          name="Corte na Hora"
          right={
            <>
              <a
                href="#planos"
                className="focus-ring hidden rounded-full px-2 text-sm text-ink/85 transition-colors hover:text-ink sm:block"
              >
                Planos
              </a>
              <a
                href="#painel"
                className="focus-ring hidden rounded-full px-2 text-sm text-ink/85 transition-colors hover:text-ink sm:block"
              >
                Painel
              </a>
              <Link
                to="/agendar"
                className="lift picked focus-ring rounded-full px-5 py-2.5 text-sm font-medium"
              >
                Testar o chat
              </Link>
            </>
          }
        />

        {/* HERO */}
        <section className="grid items-center gap-14 pb-16 lg:grid-cols-[1fr_minmax(0,600px)] lg:pb-24">
          <div className="rise space-y-7">
            <p className="text-sm font-medium tracking-wide text-brand uppercase">
              Para barbearias
            </p>
            <h1 className="text-[42px] leading-[1.02] font-light tracking-[-0.03em] text-ink sm:text-[56px] lg:text-[64px]">
              Sua barbearia agendando sozinha, 24h, pelo chat
            </h1>
            <p className="max-w-xl text-lg leading-relaxed font-light text-ink/85 sm:text-xl">
              O cliente conversa com o assistente, escolhe um horário livre e recebe a confirmação
              na hora. Você fica com a máquina na mão, não com o celular.
            </p>
            <ul className="space-y-3 text-[17px] text-ink/90">
              {[
                "Acaba o “tem horário?” no WhatsApp",
                "Horário duplicado não existe: o sistema trava",
                "Nome e telefone de cada cliente salvos no painel",
                "Pronto para usar em 24h, sem instalar nada",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CircleCheck className="size-6 shrink-0 text-brand" strokeWidth={1.6} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <a
                href="#planos"
                className="lift picked focus-ring flex items-center justify-center rounded-full px-9 py-4 text-lg font-medium"
              >
                Ver planos
              </a>
              <Link
                to="/agendar"
                className="lift glass2 focus-ring flex items-center justify-center rounded-full px-7 py-4 text-lg font-medium text-ink"
              >
                Testar o chat ao vivo
              </Link>
            </div>
            <p className="text-sm text-slate7">
              A partir de {money(YEARLY_PER_MONTH)}/mês · sem fidelidade no plano mensal
            </p>
          </div>

          <div className="rise" style={{ "--delay": "150ms" } as React.CSSProperties}>
            <ChatDemo />
            <p className="mt-6 text-center text-xs text-slate7 lg:mr-[236px]">
              Demonstração real com a barbearia de exemplo. Toque em “Testar o chat” para agendar de
              verdade.
            </p>
          </div>
        </section>

        {/* DOR */}
        <section className="py-20 text-center">
          <h2 className="text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
            Isso acontece na sua barbearia?
          </h2>
          <p className="mt-4 text-lg font-light text-ink/80">
            Todo dia, enquanto você corta, a agenda pede atenção.
          </p>
          <div className="mt-14 grid gap-12 sm:grid-cols-3">
            {[
              {
                icon: MessageSquareWarning,
                text: "O WhatsApp enche de “tem horário hoje?” e você responde entre um cliente e outro",
              },
              {
                icon: CalendarX,
                text: "Dois clientes aparecem no mesmo horário porque a agenda ficou na cabeça",
              },
              {
                icon: BellOff,
                text: "Quem não consegue resposta na hora marca em outra barbearia",
              },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-6">
                <Icon className="size-16 text-brand" strokeWidth={1.2} />
                <p className="max-w-xs text-xl leading-snug font-light text-ink">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAIXA */}
        <section className="rounded-[40px] bg-brand px-8 py-12 sm:px-14 sm:py-16">
          <div className="flex flex-col items-center gap-10 sm:flex-row">
            <div className="grid size-40 shrink-0 place-items-center overflow-hidden rounded-full bg-cream sm:size-52">
              <Mustache className="size-40 sm:size-52" />
            </div>
            <blockquote className="text-2xl leading-snug font-light text-white italic sm:text-3xl">
              “Enquanto você está com a máquina na mão, o chat está marcando o próximo cliente.”
              <footer className="mt-4 text-base text-white/80 not-italic">
                Corte na Hora · agendamento por chat para barbearias
              </footer>
            </blockquote>
          </div>
        </section>

        {/* O QUE VOCÊ GANHA */}
        <section className="py-20">
          <div className="text-center">
            <h2 className="text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
              O que a sua barbearia ganha
            </h2>
            <p className="mt-4 text-lg font-light text-ink/80">
              Tudo isso já está no chat que você viu ali em cima.
            </p>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "Atende 24 horas",
                text: "Meia-noite, domingo, feriado. O cliente agenda quando lembra, e o horário fica reservado.",
              },
              {
                icon: ShieldCheck,
                title: "Zero horário duplicado",
                text: "O chat só mostra o que está livre e trava o horário no banco na hora da confirmação.",
              },
              {
                icon: CalendarDays,
                title: "Agenda do dia no painel",
                text: "Hora a hora, com os buracos livres, o marcador de “agora” e o status de cada cliente.",
              },
              {
                icon: Phone,
                title: "Cliente no WhatsApp em um toque",
                text: "O número fica salvo com o agendamento. Precisou remarcar, é um toque para chamar.",
              },
              {
                icon: Smartphone,
                title: "Feito para o celular",
                text: "O cliente responde com toques, sem digitar data. O link abre em qualquer aparelho.",
              },
              {
                icon: Store,
                title: "Com a cara da sua barbearia",
                text: "Seus serviços, seus preços, seus horários e seu nome no chat.",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <div
                key={title}
                style={{ "--delay": `${index * 60}ms` } as React.CSSProperties}
                className="rise glass rounded-3xl p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-brand">
                    <Icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <h3 className="text-xl font-normal text-ink">{title}</h3>
                </div>
                <p className="mt-4 text-slate7">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PAINEL */}
        <section id="painel" className="scroll-mt-24 py-20">
          <div className="text-center">
            <h2 className="text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
              O painel da equipe, de verdade
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg font-light text-ink/80">
              É assim que você vê o seu dia. Mexa à vontade: confirme, cancele, passe os dias e
              agende um cliente que ligou. São dados de exemplo, nada é salvo.
            </p>
          </div>
          <div className="mt-12">
            <DemoAgenda />
          </div>
        </section>

        {/* COMO COMEÇA */}
        <section className="py-10 text-center">
          <h2 className="text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
            Como começa
          </h2>
          <p className="mt-4 text-lg font-light text-ink/80">
            Três passos e o chat está trabalhando para você.
          </p>
          <ol className="mt-14 grid gap-12 sm:grid-cols-3">
            {[
              {
                icon: Store,
                title: "Você manda os dados",
                text: "Serviços, preços, duração e horário de funcionamento. Pelo WhatsApp mesmo.",
              },
              {
                icon: Link2,
                title: "A gente monta o seu chat",
                text: "Em até 24h você recebe o link exclusivo e o acesso ao painel.",
              },
              {
                icon: Share2,
                title: "Você compartilha o link",
                text: "Bio do Instagram, mensagem automática do WhatsApp, Google. Os agendamentos começam a cair.",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="flex flex-col items-center gap-5">
                <span className="relative grid size-16 place-items-center rounded-full bg-surface-2 text-brand">
                  <Icon className="size-7" strokeWidth={1.6} />
                  <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                </span>
                <h3 className="text-2xl font-normal text-ink">{title}</h3>
                <p className="max-w-xs text-lg leading-snug font-light text-ink/80">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* PLANOS */}
        <section id="planos" className="scroll-mt-24 py-20">
          <div className="text-center">
            <h2 className="text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
              Planos
            </h2>
            <p className="mt-4 text-lg font-light text-ink/80">
              Menos que um corte por mês. Tudo incluído nos dois planos.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-[32px] p-8",
                  plan.highlight ? "bg-brand text-white shadow-[var(--shadow-brand)]" : "glass",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-8 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-cream-ink">
                    Mais escolhido
                  </span>
                )}
                <p
                  className={cn(
                    "text-sm font-medium",
                    plan.highlight ? "text-white/80" : "text-slate7",
                  )}
                >
                  {plan.name}
                </p>
                <p className="mt-3 flex items-end gap-1">
                  <span className="text-5xl leading-none font-medium tracking-tight">
                    {money(plan.price)}
                  </span>
                  <span
                    className={cn(
                      "pb-1 text-base",
                      plan.highlight ? "text-white/80" : "text-slate7",
                    )}
                  >
                    {plan.per}
                  </span>
                </p>
                <p className={cn("mt-3 text-sm", plan.highlight ? "text-white/85" : "text-slate7")}>
                  {plan.note}
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          plan.highlight ? "text-white" : "text-brand",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className={plan.highlight ? "text-white/95" : "text-ink/90"}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href={contactUrl(plan.name)}
                  target={CONTACT.whatsapp ? "_blank" : undefined}
                  rel="noreferrer"
                  className={cn(
                    "lift focus-ring mt-8 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-medium",
                    plan.highlight ? "bg-cream text-cream-ink" : "picked",
                  )}
                >
                  Quero o plano {plan.name.toLowerCase()}
                  <ArrowRight className="size-4" />
                </a>
              </div>
            ))}
          </div>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate7">
            <span className="flex items-center gap-1.5">
              <Zap className="size-4 text-brand" /> Pronto em até 24h
            </span>
            <span className="flex items-center gap-1.5">
              <Headset className="size-4 text-brand" /> Suporte pelo WhatsApp
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-brand" /> Sem taxa de instalação
            </span>
          </p>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl py-10">
          <h2 className="text-center text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
            Perguntas frequentes
          </h2>
          <div className="mt-12 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-lg text-ink">
                  {item.q}
                  <ChevronDown className="size-5 shrink-0 text-slate7 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed font-light text-ink/80">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20 text-center">
          <h2 className="text-4xl leading-tight font-light tracking-tight text-ink sm:text-5xl">
            Deixa o chat marcar. Você corta.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg font-light text-ink/80">
            Teste o chat agora com a barbearia de exemplo e imagine ele com o seu nome.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
            <Link
              to="/agendar"
              className="lift picked focus-ring flex items-center justify-center rounded-full px-9 py-4 text-lg font-medium"
            >
              Testar o chat ao vivo
            </Link>
            <a
              href="#planos"
              className="lift glass2 focus-ring flex items-center justify-center rounded-full px-7 py-4 text-lg font-medium text-ink"
            >
              Ver planos
            </a>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-line py-10 text-sm text-slate7 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span className="flex items-center gap-3">
            <BarberPole className="h-6 w-2" />
            <span className="font-serif text-lg whitespace-nowrap text-ink">Corte na Hora</span>
            <span className="hidden sm:inline">· agendamento por chat para barbearias</span>
          </span>
          <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <a
              href={`mailto:${CONTACT.email}`}
              className="focus-ring rounded text-ink hover:underline"
            >
              {CONTACT.email}
            </a>
            <span className="text-xs">
              Ícones de{" "}
              <a
                href="https://www.flaticon.com/free-icon/barber_5148444"
                target="_blank"
                rel="noreferrer"
                className="focus-ring rounded hover:underline"
              >
                Fliqqer
              </a>{" "}
              e{" "}
              <a
                href="https://www.flaticon.com/free-icon/beard_15308199"
                target="_blank"
                rel="noreferrer"
                className="focus-ring rounded hover:underline"
              >
                Irfansusanto20
              </a>{" "}
              via Flaticon
            </span>
          </span>
        </footer>
      </div>
    </div>
  );
}
