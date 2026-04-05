export default function HeroSection() {
    return (
      <section className="flex items-center justify-center gap-10 py-24 bg-white">
        <div className="w-32 h-32 rounded-full border-4 border-[#1a2a6c] bg-gradient-to-br from-[#e8eaf8] to-[#c8ccf0] flex items-center justify-center shrink-0">
          <span className="text-4xl font-bold text-[#1a2a6c]">P</span>
        </div>
        <div>
          <h1 className="text-6xl font-bold text-[#0d1b4b] leading-tight">Career @ Penn</h1>
          <p className="mt-3 text-lg text-gray-500 max-w-md leading-relaxed">
            Professional clarity for the Penn Bubble. Data-driven career intelligence, not generic advice.
          </p>
        </div>
      </section>
    );
  }