export default function HeroSection() {
  return (
    <section className="flex items-center justify-center gap-14 py-28 px-8 bg-[#f7f9ff] border-b border-[#dde3f5]">
      <img src="/web-app-manifest-512x512.png" alt="Career @ Penn" className="w-32 h-32 rounded-full object-cover shrink-0 shadow-lg border-4 border-[#1a2a6c]" />
      <div>
        <h1 className="text-6xl font-bold tracking-tight text-[#0d1b4b] leading-tight">Career @ Penn</h1>
        <p className="mt-4 text-lg text-gray-400 max-w-md leading-relaxed">
          Professional clarity for the Penn Bubble. Data-driven career intelligence, not generic advice.
        </p>
        <div className="mt-7">
          <a
            href="/start"
            className="inline-block px-6 py-2.5 bg-[#1a2a6c] text-white rounded-lg text-sm font-semibold hover:bg-[#253a8e] transition-colors shadow-sm"
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  );
}
