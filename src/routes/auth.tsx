import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandHeader } from "@/components/BrandHeader";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no painel — Vulcan Barber" },
      {
        name: "description",
        content: "Acesso da equipe da Vulcan Barber ao painel de agendamentos.",
      },
      { property: "og:title", content: "Entrar no painel — Vulcan Barber" },
      { property: "og:description", content: "Acesso da equipe ao painel de agendamentos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/admin" });
        } else {
          toast.success("Conta criada! Confirme o e-mail para entrar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/admin" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 size-[460px] rounded-full bg-gold/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <BrandHeader />
        <div className="mx-auto max-w-md">
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              {mode === "login" ? "Entrar no painel" : "Criar acesso da equipe"}
            </h2>
            <p className="mt-1 text-xs text-slate7">
              Só a equipe da barbearia vê os agendamentos.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-2">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-mail"
                className="glass2 w-full rounded-xl px-4 py-2.5 text-sm text-ink outline-none placeholder:text-slate7/60"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha"
                className="glass2 w-full rounded-xl px-4 py-2.5 text-sm text-ink outline-none placeholder:text-slate7/60"
              />
              <button
                type="submit"
                disabled={busy}
                className="lift w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-60"
              >
                {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
              </button>
            </form>

            <button
              onClick={google}
              className="lift glass2 mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-ink"
            >
              Continuar com Google
            </button>

            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="mt-4 w-full text-xs text-slate7"
            >
              {mode === "login" ? "Não tem acesso? Criar conta" : "Já tenho conta. Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
