"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";

const SCHOOLS = ["SEAS", "Wharton", "CAS", "Nursing"];
const YEARS = ["2026", "2027", "2028", "2029", "2030"];

const inputClassName =
  "w-full text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]";

function useMajors(school: string) {
  const [majors, setMajors] = useState<string[]>([]);
  useEffect(() => {
    if (!school) { setMajors([]); return; }
    fetch(`/api/penn-majors?schools=${encodeURIComponent(school)}`)
      .then((r) => r.json())
      .then((d) => setMajors(d.majors ?? []))
      .catch(() => setMajors([]));
  }, [school]);
  return majors;
}

type ProfileData = {
  id: number | null;
  name: string;
  school: string;    // comma-separated, e.g. "SEAS, Wharton"
  major: string;     // pipe-separated, e.g. "CS, BSE | Finance, BS"
  class_year: string;
  clubs: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    id: null, name: "", school: "", major: "", class_year: "", clubs: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const schoolRef = useRef<HTMLDivElement>(null);

  const selectedSchools = useMemo(
    () => profile.school.split(",").map((s) => s.trim()).filter(Boolean),
    [profile.school]
  );

  const majorParts = useMemo(
    () => profile.major.split(" | ").map((m) => m.trim()),
    [profile.major]
  );

  const school1 = selectedSchools[0] ?? "";
  const school2 = selectedSchools[1] ?? "";
  const majors1 = useMajors(school1);
  const majors2 = useMajors(school2);

  function setMajorPart(index: 0 | 1, value: string) {
    const parts = [...majorParts];
    parts[index] = value;
    setProfile((p) => ({ ...p, major: parts.filter(Boolean).join(" | ") }));
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (schoolRef.current && !schoolRef.current.contains(e.target as Node)) {
        setSchoolOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/user");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");

        // If no saved profile on server, fall back to localStorage guest data
        if (json.id === null) {
          try {
            const raw = localStorage.getItem("guestProfile");
            if (raw) {
              const g = JSON.parse(raw);
              setProfile({
                id: null,
                name: g.name ?? "",
                school: g.school ?? "",
                major: g.major ?? "",
                class_year: g.class_year ?? "",
                clubs: g.clubs ?? "",
              });
              return;
            }
          } catch {
            // malformed localStorage — ignore
          }
        }

        setProfile({
          id: json.id ?? null,
          name: json.name ?? "",
          school: json.school ?? "",
          major: json.major ?? "",
          class_year: json.class_year ?? "",
          clubs: json.clubs ?? "",
        });
      } catch {
        setMessage("Could not load profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function updateField<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSchool(school: string) {
    const current = [...selectedSchools];
    const exists = current.includes(school);
    if (exists) {
      const next = current.filter((s) => s !== school);
      updateField("school", next.join(", "));
      // drop the major for the removed school
      const idx = current.indexOf(school);
      const parts = [...majorParts];
      parts.splice(idx, 1);
      setProfile((p) => ({ ...p, school: next.join(", "), major: parts.filter(Boolean).join(" | ") }));
    } else {
      if (current.length >= 2) return;
      updateField("school", [...current, school].join(", "));
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const isNew = profile.id === null;
      const res = await fetch("/api/user", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.id,
          name: profile.name,
          school: profile.school,
          major: profile.major,
          class_year: profile.class_year,
          clubs: profile.clubs,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      if (isNew && json.data?.[0]?.id) {
        setProfile((prev) => ({ ...prev, id: json.data[0].id }));
      }
      // persist to localStorage too so guest flow stays in sync
      localStorage.setItem("guestProfile", JSON.stringify({
        name: profile.name,
        school: profile.school,
        major: profile.major,
        class_year: profile.class_year,
        clubs: profile.clubs,
      }));
      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 mt-1">Update your academic background and campus involvement.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-9 bg-gray-100 rounded" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-9 bg-gray-100 rounded" />
                <div className="h-9 bg-gray-100 rounded" />
                <div className="h-9 bg-gray-100 rounded" />
              </div>
              <div className="h-28 bg-gray-100 rounded" />
            </div>
          ) : (
            <>
              <div className="mb-5">
                <label className="block text-sm text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className={inputClassName}
                />
              </div>

              {/* School picker */}
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">School (up to 2)</label>
                <div className="relative" ref={schoolRef}>
                  <div
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => setSchoolOpen((p) => !p)}
                  >
                    <span className={selectedSchools.length ? "text-gray-900" : "text-gray-400"}>
                      {selectedSchools.length ? selectedSchools.join(", ") : "Select school(s)"}
                    </span>
                    <span className="text-gray-400 text-xs">{schoolOpen ? "▲" : "▼"}</span>
                  </div>
                  {schoolOpen && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1">
                      {SCHOOLS.map((s) => {
                        const checked = selectedSchools.includes(s);
                        const disabled = !checked && selectedSchools.length >= 2;
                        return (
                          <label
                            key={s}
                            className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-900"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleSchool(s)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            {s}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Major dropdowns — one per school */}
              <div className={`grid gap-3 mb-4 ${school2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {school1 ? (
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">
                      {school2 ? `${school1} Major` : "Major"}
                    </label>
                    <select
                      value={majorParts[0] ?? ""}
                      onChange={(e) => setMajorPart(0, e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select major</option>
                      {majors1.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Major</label>
                    <select className={inputClassName} disabled>
                      <option>Select school first</option>
                    </select>
                  </div>
                )}
                {school2 && (
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">{school2} Major</label>
                    <select
                      value={majorParts[1] ?? ""}
                      onChange={(e) => setMajorPart(1, e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select major</option>
                      {majors2.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Year */}
              <div className="mb-5">
                <label className="block text-sm text-gray-500 mb-1">Class Year</label>
                <select value={profile.class_year} onChange={(e) => updateField("class_year", e.target.value)} className={inputClassName}>
                  <option value="">Select year</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-500 mb-1">Campus Clubs & Recreation</label>
                <textarea
                  value={profile.clubs}
                  onChange={(e) => updateField("clubs", e.target.value)}
                  placeholder="e.g. Penn Spark, WITG..."
                  className="w-full text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#1a2a6c] text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-[#253a8e] disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                {message && (
                  <p className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-500"}`}>
                    {message}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
