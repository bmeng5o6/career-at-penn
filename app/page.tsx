"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface OutcomeRow {
  id: number;
  school: string;
  class_year: number;
  known_outcomes: number | null;
  full_time_employment: number | null;
  continuing_education: number | null;
  seeking_employment: number | null;
  part_time_employment: number | null;
  overall_positive_rate: number | null;
}

interface Stats {
  record_count: number;
  year_range: { min: number; max: number };
  averages: {
    full_time_employment: number | null;
    continuing_education: number | null;
    seeking_employment: number | null;
    part_time_employment: number | null;
    overall_positive_rate: number | null;
  };
}

function pct(value: number | null) {
  if (value == null) return "\u2014";
  return `${(value * 100).toFixed(1)}%`;
}

export default function Home() {
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchSchools() {
      const { data } = await supabase
        .from("penn_outcomes")
        .select("school")
        .order("school");
      if (data) {
        const unique = [...new Set(data.map((r: { school: string }) => r.school))];
        setSchools(unique);
      }
    }
    fetchSchools();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      let query = supabase
        .from("penn_outcomes")
        .select("*")
        .order("class_year", { ascending: false });

      if (selectedSchool) {
        query = query.ilike("school", selectedSchool);
      }

      const { data } = await query;

      if (data) {
        setOutcomes(data as OutcomeRow[]);

        const avg = (arr: (number | null)[]) => {
          const valid = arr.filter((v): v is number => v != null);
          return valid.length
            ? +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(3)
            : null;
        };

        setStats({
          record_count: data.length,
          year_range: {
            min: Math.min(...data.map((r) => r.class_year)),
            max: Math.max(...data.map((r) => r.class_year)),
          },
          averages: {
            full_time_employment: avg(data.map((r) => r.full_time_employment)),
            continuing_education: avg(data.map((r) => r.continuing_education)),
            seeking_employment: avg(data.map((r) => r.seeking_employment)),
            part_time_employment: avg(data.map((r) => r.part_time_employment)),
            overall_positive_rate: avg(data.map((r) => r.overall_positive_rate)),
          },
        });
      }

      setLoading(false);
    }
    fetchData();
  }, [selectedSchool]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Career at Penn
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Post-graduation outcomes by school and class year
        </p>

        {/* School Filter */}
        <div className="mb-8">
          <label htmlFor="school-select" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Filter by School
          </label>
          <select
            id="school-select"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Stats Summary Cards */}
        {stats && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Avg Full-Time Employment" value={pct(stats.averages.full_time_employment)} />
            <StatCard label="Avg Continuing Education" value={pct(stats.averages.continuing_education)} />
            <StatCard label="Avg Seeking Employment" value={pct(stats.averages.seeking_employment)} />
            <StatCard label="Avg Part-Time Employment" value={pct(stats.averages.part_time_employment)} />
            <StatCard label="Avg Positive Outcome Rate" value={pct(stats.averages.overall_positive_rate)} />
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
        ) : outcomes.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No data found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-900 text-left text-zinc-600 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Class Year</th>
                  <th className="px-4 py-3 font-medium text-right">Known Outcomes</th>
                  <th className="px-4 py-3 font-medium text-right">Full-Time Employment</th>
                  <th className="px-4 py-3 font-medium text-right">Continuing Education</th>
                  <th className="px-4 py-3 font-medium text-right">Seeking Employment</th>
                  <th className="px-4 py-3 font-medium text-right">Part-Time</th>
                  <th className="px-4 py-3 font-medium text-right">Positive Outcome</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.school}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.class_year}</td>
                    <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{row.known_outcomes ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{pct(row.full_time_employment)}</td>
                    <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{pct(row.continuing_education)}</td>
                    <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{pct(row.seeking_employment)}</td>
                    <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{pct(row.part_time_employment)}</td>
                    <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{pct(row.overall_positive_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {stats && !loading && (
          <p className="mt-4 text-xs text-zinc-400">
            {stats.record_count} records | Class years {stats.year_range.min}\u2013{stats.year_range.max}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
