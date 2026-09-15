import { Link } from "@tanstack/react-router";

export function BrandHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="glass2 grid size-11 place-items-center rounded-2xl bg-steel">
          <span className="font-display text-xl text-brand-foreground">V</span>
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold leading-none text-ink">
            Vulcan Barber
          </h1>
          <p className="mt-1 text-xs text-slate7">Agendamento inteligente</p>
        </div>
      </Link>
      {right}
    </header>
  );
}
