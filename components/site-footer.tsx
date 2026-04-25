export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.07] bg-zinc-950/60 px-4 py-12 sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div>
          <p className="text-sm font-medium text-zinc-300">
            Abd Alkareem Abu-Alsoud
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Full-stack software engineer · SaaS, APIs, CRM, mobile products
          </p>
        </div>
        <p className="text-xs text-zinc-600">
          Next.js · Tailwind CSS · shadcn/ui
        </p>
      </div>
    </footer>
  );
}
