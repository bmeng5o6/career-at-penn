import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import HtmlBackground from "./components/HtmlBackground";

const stats = [
  { value: "400+", label: "employer records" },
  { value: "2,400+", label: "Penn placements" },
  { value: "10+", label: "years of outcomes data" },
];

const features = [
  {
    tag: "Post-grad outcomes",
    heading: "Where does Penn actually send people?",
    body: "Full-time employment, grad school, and seeking rates across Wharton, SEAS, CAS, and Nursing. Filter by class year and track how outcomes have shifted over the last decade.",
  },
  {
    tag: "Major placements",
    heading: "Your major, mapped to real placements",
    body: "2,400+ Penn intern placements from the Summer Outcomes survey, broken down by major, role, company, and class year. Filter by your major and see exactly who's been hiring.",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      <HtmlBackground color="#0d1b4b" />
      <Navbar />
      <HeroSection />

      {/* Stats strip */}
      <div className="bg-white border-b border-gray-100 py-7 px-8">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-[#0d1b4b]">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature sections */}
      <div className="bg-white py-20 px-8">
        <div className="max-w-4xl mx-auto divide-y divide-gray-100">
          {features.map((f) => (
            <div key={f.tag} className="grid grid-cols-[1fr_1.6fr] gap-16 py-14 first:pt-0 last:pb-0">
              <div>
                <span className="text-xs font-semibold text-[#1a2a6c] uppercase tracking-widest">
                  {f.tag}
                </span>
                <h2 className="mt-3 text-xl font-bold text-[#0d1b4b] leading-snug">{f.heading}</h2>
              </div>
              <p className="text-gray-500 leading-relaxed self-center">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA — flex-1 makes it fill remaining space so blue extends to bottom */}
      <div className="flex-1 bg-[#0d1b4b] py-16 px-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to explore?</h2>
        <p className="text-blue-300 text-sm mb-8 max-w-sm mx-auto">
          No account required. Tell us about yourself and we&apos;ll show you what matters for your path.
        </p>
        <a
          href="/start"
          className="inline-block px-8 py-3 bg-white text-[#0d1b4b] rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
        >
          Get Started
        </a>
      </div>
    </main>
  );
}
