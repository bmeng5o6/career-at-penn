"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";

const SCHOOLS = ["SEAS", "Wharton", "CAS", "Nursing"];
const MAJORS = ["CIS", "Math", "Finance", "Economics", "Biology", "Political Science"];
const YEARS = ["2026", "2027", "2028", "2029", "2030"];

const inputClassName =
  "w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]";

type ProfileData = {
  name: string;
  school: string;
  major: string;
  class_year: string;
  clubs: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    school: "",
    major: MAJORS[0],
    class_year: YEARS[0],
    clubs: "",
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
        const res = await fetch("/api/user", { method: "GET" });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load profile");
        }

        setProfile({
          name: json.name ?? "",
          school: json.school ?? "",
          major: json.major ?? MAJORS[0],
          class_year: String(json.class_year ?? YEARS[0]),
          clubs: json.clubs ?? "",
        });
      } catch (err) {
        console.error(err);
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
    const schools = [...selectedSchools];
    const exists = schools.includes(school);

    let nextSchools: string[];

    if (exists) {
      nextSchools = schools.filter((s) => s !== school);
    } else {
      if (schools.length >= 2) return;
      nextSchools = [...schools, school];
    }

    updateField("school", nextSchools.join(", "));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          school: profile.school,
          major: profile.major,
          class_year: profile.class_year,
          clubs: profile.clubs,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update profile");
      }

      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
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
          <p className="text-gray-500 mt-1">
            Update your academic background and campus involvement.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
          {loading ? (
            <div className="text-gray-400">Loading profile...</div>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="relative" ref={schoolRef}>
                  <label className="block text-sm text-gray-500 mb-1">School (up to 2)</label>
                  <div
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => setSchoolOpen((prev) => !prev)}
                  >
                    <span className={selectedSchools.length ? "text-gray-900" : "text-gray-400"}>
                      {selectedSchools.length ? selectedSchools.join(", ") : "Select school(s)"}
                    </span>
                    <span className="text-gray-400 text-xs">{schoolOpen ? "▲" : "▼"}</span>
                  </div>

                  {schoolOpen && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1">
                      {SCHOOLS.map((school) => {
                        const checked = selectedSchools.includes(school);
                        const disabled = !checked && selectedSchools.length >= 2;

                        return (
                          <label
                            key={school}
                            className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                              disabled ? "opacity-40 cursor-not-allowed" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleSchool(school)}
                            />
                            {school}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Major</label>
                  <select
                    value={profile.major}
                    onChange={(e) => updateField("major", e.target.value)}
                    className={inputClassName}
                  >
                    {MAJORS.map((major) => (
                      <option key={major} value={major}>
                        {major}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Class Year</label>
                  <select
                    value={profile.class_year}
                    onChange={(e) => updateField("class_year", e.target.value)}
                    className={inputClassName}
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-500 mb-1">Campus Clubs & Recreation</label>
                <textarea
                  value={profile.clubs}
                  onChange={(e) => updateField("clubs", e.target.value)}
                  placeholder="e.g. Penn Labs, Wharton Investment Club..."
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]"
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
                  <p className="text-sm text-gray-500">{message}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}