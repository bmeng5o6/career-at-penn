"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SCHOOLS = ["SEAS", "Wharton", "CAS", "Nursing"];
const YEARS   = ["2026", "2027", "2028", "2029", "2030"];

const selectClassName =
  "w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]";

function useMajors(school: string) {
  const [majors, setMajors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!school) { setMajors([]); return; }
    setLoading(true);
    fetch(`/api/penn-majors?schools=${encodeURIComponent(school)}`)
      .then((r) => r.json())
      .then((d) => setMajors(d.majors ?? []))
      .catch(() => setMajors([]))
      .finally(() => setLoading(false));
  }, [school]);

  return { majors, loading };
}

export default function EntryForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [schoolPrimary, setSchoolPrimary] = useState("");
  const [schoolSecondary, setSchoolSecondary] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [majorPrimary, setMajorPrimary] = useState("");
  const [majorSecondary, setMajorSecondary] = useState("");
  const [year, setYear] = useState("");
  const [clubs, setClubs] = useState("");
  const [loading, setLoading] = useState(false);

  const schoolRef = useRef<HTMLDivElement>(null);

  const { majors: majors1, loading: loadingMajors1 } = useMajors(schoolPrimary);
  const { majors: majors2, loading: loadingMajors2 } = useMajors(schoolSecondary);

  // Reset majors when schools change
  useEffect(() => { setMajorPrimary(""); }, [schoolPrimary]);
  useEffect(() => { setMajorSecondary(""); }, [schoolSecondary]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (schoolRef.current && !schoolRef.current.contains(e.target as Node)) {
        setSchoolOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleSchool(o: string) {
    const selected = [schoolPrimary, schoolSecondary].filter(Boolean);
    const checked = selected.includes(o);
    if (checked) {
      const remaining = selected.filter((s) => s !== o);
      setSchoolPrimary(remaining[0] || "");
      setSchoolSecondary(remaining[1] || "");
    } else {
      if (!schoolPrimary) setSchoolPrimary(o);
      else if (!schoolSecondary) setSchoolSecondary(o);
    }
  }

  const selected = [schoolPrimary, schoolSecondary].filter(Boolean);
  const majorForDb = [majorPrimary, majorSecondary].filter(Boolean).join(" | ");
  const schoolForDb = selected.join(", ");

  async function handleSubmit() {
    setLoading(true);
    const profile = { name, school: schoolForDb, major: majorForDb, class_year: year, clubs };
    localStorage.setItem("guestProfile", JSON.stringify(profile));
    try {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } catch {
      // guest flow — continue without saving
    }
    router.push("/internship");
    setLoading(false);
  }

  return (
    <section id="entry-form" className="bg-[#edf0f9] py-14 px-8">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-xl mx-auto shadow-md">
        <h3 className="text-xs font-semibold text-[#1a2a6c] uppercase tracking-widest mb-6">Tell us about yourself</h3>

        {/* Name */}
        <div className="mb-5">
          <label className="block text-sm text-gray-500 mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Jane Smith"
            className="w-full text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]"
          />
        </div>

        {/* School picker */}
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">School (up to 2)</label>
          <div className="relative" ref={schoolRef}>
            <div
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-pointer flex justify-between items-center"
              onClick={() => setSchoolOpen(!schoolOpen)}
            >
              <span className={selected.length ? "text-gray-900" : "text-gray-400"}>
                {selected.length ? selected.join(", ") : "Select school(s)"}
              </span>
              <span className="text-gray-400 text-xs">{schoolOpen ? "▲" : "▼"}</span>
            </div>
            {schoolOpen && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1">
                {SCHOOLS.map((o) => {
                  const checked = selected.includes(o);
                  const disabled = !checked && selected.length >= 2;
                  return (
                    <label
                      key={o}
                      className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-900"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleSchool(o)}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Major row(s) */}
        <div className={`grid gap-3 mb-5 ${schoolSecondary ? "grid-cols-2" : "grid-cols-1"}`}>
          {schoolPrimary && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                {schoolSecondary ? `${schoolPrimary} Major` : "Major"}
              </label>
              <select
                value={majorPrimary}
                onChange={(e) => setMajorPrimary(e.target.value)}
                className={selectClassName}
              >
                <option value="">{loadingMajors1 ? "Loading..." : "Select major"}</option>
                {majors1.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {schoolSecondary && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">{schoolSecondary} Major</label>
              <select
                value={majorSecondary}
                onChange={(e) => setMajorSecondary(e.target.value)}
                className={selectClassName}
              >
                <option value="">{loadingMajors2 ? "Loading..." : "Select major"}</option>
                {majors2.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {!schoolPrimary && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">Major</label>
              <select className={selectClassName} disabled>
                <option value="">Select school first</option>
              </select>
            </div>
          )}
        </div>

        {/* Year */}
        <div className="mb-5">
          <label className="block text-sm text-gray-500 mb-1">Class Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClassName}>
            <option value="">Select year</option>
            {YEARS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Clubs */}
        <div className="mb-5">
          <label className="block text-sm text-gray-500 mb-1">Campus Clubs & Recreation</label>
          <textarea
            value={clubs}
            onChange={e => setClubs(e.target.value)}
            placeholder="e.g. Penn Labs, Wharton Investment Club..."
            className="w-full text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#1a2a6c] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#253a8e] disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading..." : "Enter Career@Penn  ›"}
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          <a href="/signin" className="text-[#1a2a6c] font-medium hover:underline">Sign in with Google</a>
          {" to save your profile"}
        </p>
      </div>
    </section>
  );
}
