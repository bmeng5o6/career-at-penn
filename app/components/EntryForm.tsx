"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SCHOOLS = ["SEAS", "Wharton", "CAS", "Nursing"];
const MAJORS  = ["CIS", "Math", "Finance", "Economics", "Biology", "Political Science"];
const YEARS   = ["2026", "2027", "2028", "2029", "2030"];

const selectClassName =
  "w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]";

export default function EntryForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [schoolPrimary, setSchoolPrimary] = useState("");
  const [schoolSecondary, setSchoolSecondary] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [clubs, setClubs] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const schoolRef = useRef<HTMLDivElement>(null);

  const schools = [...new Set([schoolPrimary, schoolSecondary].filter(Boolean))];
  const schoolForDb = schools.join(", ");

  // If user already has a profile, skip this form
  useEffect(() => {
    async function check() {
      const res = await fetch("/api/user");
      if (res.ok) {
        const json = await res.json();
        if (json.id !== null) {
          router.replace("/internship");
          return;
        }
      }
      setChecking(false);
    }
    check();
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (schoolRef.current && !schoolRef.current.contains(e.target as Node)) {
        setSchoolOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit() {
    setLoading(true);

    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, school: schoolForDb, major, class_year: year, clubs }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("Submit failed:", json.error);
    } else {
      router.push("/internship");
    }

    setLoading(false);
  }

  if (checking) return null;

  return (
    <section className="bg-gray-100 py-12 px-8">
      <div className="bg-white border border-gray-200 rounded-xl p-7 max-w-xl mx-auto">
        <h3 className="text-purple-600 font-medium mb-5">Tell us about yourself</h3>

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

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="relative" ref={schoolRef}>
            <label className="block text-sm text-gray-500 mb-1">School (up to 2)</label>
            <div
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-pointer flex justify-between items-center"
              onClick={() => setSchoolOpen(!schoolOpen)}
            >
              <span className={schools.length ? "text-gray-900" : "text-gray-400"}>
                {schools.length ? schools.join(", ") : "Select school(s)"}
              </span>
              <span className="text-gray-400 text-xs">{schoolOpen ? "▲" : "▼"}</span>
            </div>
            {schoolOpen && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1">
                {SCHOOLS.map((o) => {
                  const checked = schools.includes(o);
                  const disabled = !checked && schools.length >= 2;
                  return (
                    <label
                      key={o}
                      className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-gray-50 ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          if (checked) {
                            const remaining = schools.filter(s => s !== o);
                            setSchoolPrimary(remaining[0] || "");
                            setSchoolSecondary(remaining[1] || "");
                          } else {
                            if (!schoolPrimary) setSchoolPrimary(o);
                            else setSchoolSecondary(o);
                          }
                        }}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Major</label>
            <select value={major} onChange={(e) => setMajor(e.target.value)} className={selectClassName}>
              <option value="">Select major</option>
              {MAJORS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Class Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClassName}>
              <option value="">Select year</option>
              {YEARS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

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
          className="w-full bg-[#1a2a6c] text-white py-3 rounded-md text-sm font-medium hover:bg-[#253a8e] disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading..." : "Enter Career@Penn  ›"}
        </button>
      </div>
    </section>
  );
}