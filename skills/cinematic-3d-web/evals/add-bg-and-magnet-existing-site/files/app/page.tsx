export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-8 px-6 py-24">
      <p className="text-sm uppercase tracking-[0.3em] text-[#8B5CF6]">Jo Studio</p>
      <h1 className="text-5xl font-black leading-tight sm:text-7xl">Brands and websites that people remember.</h1>
      <p className="max-w-xl text-lg text-[#EDEAF5]/70">
        I&apos;m Jo, an independent designer helping small teams launch with confidence.
      </p>
      <div>
        <a
          href="mailto:hello@jostudio.example"
          className="inline-block rounded-full bg-[#8B5CF6] px-8 py-4 font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.5)]"
        >
          Hire me
        </a>
      </div>
      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {['Brand identity', 'Web design', 'Launch kits'].map((s) => (
          <div key={s} className="rounded-2xl border border-white/10 p-6">
            <h2 className="font-bold">{s}</h2>
          </div>
        ))}
      </section>
    </main>
  )
}
