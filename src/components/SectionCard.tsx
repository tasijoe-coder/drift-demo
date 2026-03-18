type SectionCardProps = {
  name: string
  description: string
}

export function SectionCard({ name, description }: SectionCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/20">
      <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">src</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{name}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  )
}
