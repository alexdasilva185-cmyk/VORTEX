import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-800 px-3 py-1 text-xs font-medium mb-6">
          Plataforma de Checkout
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-ink-900 mb-4">
          Seu checkout próprio,
          <br /> do jeito que você quiser.
        </h1>
        <p className="text-ink-600 mb-8">
          Cadastre seus produtos, ative order bumps, configure coprodutores
          e dispare webhooks — tudo em um só lugar.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/admin" className="btn-primary">
            Entrar no painel
          </Link>
        </div>
      </div>
    </main>
  );
}
