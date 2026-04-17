"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "../components/Navbar";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type MetricKey =
  | "full_time_employment"
  | "continuing_education"
  | "seeking_employment"
  | "part_time_employment"
  | "overall_positive_rate";

// ── Constants ─────────────────────────────────────────────────────────────────

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "full_time_employment",  label: "Full-Time Employment" },
  { key: "continuing_education",  label: "Continuing Education" },
  { key: "seeking_employment",    label: "Seeking Employment" },
  { key: "part_time_employment",  label: "Part-Time Employment" },
  { key: "overall_positive_rate", label: "Overall Positive Rate" },
];

const SCHOOL_COLORS: Record<string, string> = {
  Wharton:  "#1a2a6c",
  SEAS:     "#e63946",
  CAS:      "#2a9d8f",
  Nursing:  "#e76f51",
};

const ALL_SCHOOLS = Object.keys(SCHOOL_COLORS);

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(v: number | null | undefined) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function avg(rows: OutcomeRow[], key: MetricKey): number | null {
  const valid = rows.map((r) => r[key]).filter((v): v is number => v != null);
  return valid.length ? +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(3) : null;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{pct(p.value / 100)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Pill filter button ─────────────────────────────────────────────────────────

function Pill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
        active
          ? "text-white border-transparent shadow-sm"
          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
      }`}
      style={active ? { backgroundColor: color ?? "#1a2a6c", borderColor: color ?? "#1a2a6c" } : {}}
    >
      {label}
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#1a2a6c]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const supabase = createClient();

  const [allData, setAllData] = useState<OutcomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSchools, setSelectedSchools] = useState<string[]>(ALL_SCHOOLS);
  const [yearFrom, setYearFrom] = useState<number | "">("");
  const [yearTo, setYearTo]     = useState<number | "">("");
  const [metric, setMetric]     = useState<MetricKey>("full_time_employment");

  // Fetch all data once
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("penn_outcomes")
        .select("*")
        .order("class_year", { ascending: true });
      if (!error && data) setAllData(data as OutcomeRow[]);
      setLoading(false);
    }
    load();
  }, []);

  // Derived year bounds from data
  const yearBounds = useMemo(() => {
    if (!allData.length) return { min: 2021, max: 2025 };
    return {
      min: Math.min(...allData.map((r) => r.class_year)),
      max: Math.max(...allData.map((r) => r.class_year)),
    };
  }, [allData]);

  const years = useMemo(() => {
    const all = [...new Set(allData.map((r) => r.class_year))].sort();
    return all;
  }, [allData]);

  // Apply filters
  const filtered = useMemo(() => {
    return allData.filter((r) => {
      if (selectedSchools.length && !selectedSchools.includes(r.school)) return false;
      if (yearFrom !== "" && r.class_year < yearFrom) return false;
      if (yearTo   !== "" && r.class_year > yearTo)   return false;
      return true;
    });
  }, [allData, selectedSchools, yearFrom, yearTo]);

  // ── Chart data: line chart (metric over years, one line per school) ──────────
  const lineData = useMemo(() => {
    return years
      .filter((y) => {
        if (yearFrom !== "" && y < yearFrom) return false;
        if (yearTo   !== "" && y > yearTo)   return false;
        return true;
      })
      .map((year) => {
        const entry: Record<string, number | string> = { year };
        for (const school of selectedSchools) {
          const row = allData.find((r) => r.school === school && r.class_year === year);
          const val = row?.[metric];
          if (val != null) entry[school] = +(val * 100).toFixed(1);
        }
        return entry;
      });
  }, [allData, years, selectedSchools, metric, yearFrom, yearTo]);

  // ── Chart data: bar chart (all metrics for a given school, averaged over years) ──
  const barData = useMemo(() => {
    return METRICS.map(({ key, label }) => {
      const entry: Record<string, string | number> = { metric: label };
      for (const school of selectedSchools) {
        const rows = filtered.filter((r) => r.school === school);
        const a = avg(rows, key);
        if (a != null) entry[school] = +(a * 100).toFixed(1);
      }
      return entry;
    });
  }, [filtered, selectedSchools]);

  // ── Summary stats ────────────────────────────────────────────────────────────
  const summaryStats = useMemo(() => ({
    employment:  avg(filtered, "full_time_employment"),
    gradSchool:  avg(filtered, "continuing_education"),
    seeking:     avg(filtered, "seeking_employment"),
    positive:    avg(filtered, "overall_positive_rate"),
    records:     filtered.length,
  }), [filtered]);

  // ── Toggle school ────────────────────────────────────────────────────────────
  function toggleSchool(school: string) {
    setSelectedSchools((prev) =>
      prev.includes(school)
        ? prev.length > 1 ? prev.filter((s) => s !== school) : prev // keep at least 1
        : [...prev, school]
    );
  }

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric;

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="max-w-6xl mx-auto py-10 px-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Penn Outcomes Statistics</h1>
          <p className="text-gray-500 mt-1">
            Post-graduation outcomes across Penn schools — filter and explore the data.
          </p>
        </div>

        {/* ── Filters ──────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-6 items-start">

            {/* School filter */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">School</p>
              <div className="flex gap-2 flex-wrap">
                {ALL_SCHOOLS.map((s) => (
                  <Pill
                    key={s}
                    label={s}
                    active={selectedSchools.includes(s)}
                    color={SCHOOL_COLORS[s]}
                    onClick={() => toggleSchool(s)}
                  />
                ))}
              </div>
            </div>

            {/* Year range */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Year Range</p>
              <div className="flex items-center gap-2">
                <select
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]"
                >
                  <option value="">From</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="text-gray-400">–</span>
                <select
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]"
                >
                  <option value="">To</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                {(yearFrom !== "" || yearTo !== "") && (
                  <button
                    onClick={() => { setYearFrom(""); setYearTo(""); }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Metric selector */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Metric (Trend Chart)</p>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as MetricKey)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]"
              >
                {METRICS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading data…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400">No data matches your filters.</div>
        ) : (
          <>
            {/* ── Summary Stat Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Avg Full-Time Employment" value={pct(summaryStats.employment)} sub={`${summaryStats.records} records`} />
              <StatCard label="Avg Continuing Education" value={pct(summaryStats.gradSchool)} />
              <StatCard label="Avg Seeking Employment"  value={pct(summaryStats.seeking)} />
              <StatCard label="Avg Positive Outcome"    value={pct(summaryStats.positive)} />
            </div>

            {/* ── Line Chart: Trend Over Time ────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                {metricLabel} Over Time
              </h2>
              <p className="text-xs text-gray-400 mb-6">One line per selected school, by class year</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  {selectedSchools.map((school) => (
                    <Line
                      key={school}
                      type="monotone"
                      dataKey={school}
                      stroke={SCHOOL_COLORS[school] ?? "#888"}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── Bar Chart: All Metrics, School Comparison ──────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                Outcome Breakdown by School
              </h2>
              <p className="text-xs text-gray-400 mb-6">
                Average across selected year range — all outcome categories
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 24, left: 0, bottom: 60 }}
                  barGap={4}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="top" />
                  {selectedSchools.map((school) => (
                    <Bar key={school} dataKey={school} fill={SCHOOL_COLORS[school] ?? "#888"} radius={[3, 3, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={SCHOOL_COLORS[school] ?? "#888"} />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Raw Data Table ─────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Raw Data</h2>
                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 font-medium">School</th>
                      <th className="px-5 py-3 font-medium">Year</th>
                      <th className="px-5 py-3 font-medium text-right">Known Outcomes</th>
                      <th className="px-5 py-3 font-medium text-right">Full-Time</th>
                      <th className="px-5 py-3 font-medium text-right">Grad School</th>
                      <th className="px-5 py-3 font-medium text-right">Seeking</th>
                      <th className="px-5 py-3 font-medium text-right">Part-Time</th>
                      <th className="px-5 py-3 font-medium text-right">Positive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered
                      .slice()
                      .sort((a, b) => b.class_year - a.class_year || a.school.localeCompare(b.school))
                      .map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: SCHOOL_COLORS[row.school] ?? "#888" }}
                            >
                              {row.school}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{row.class_year}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{row.known_outcomes ?? "—"}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{pct(row.full_time_employment)}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{pct(row.continuing_education)}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{pct(row.seeking_employment)}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{pct(row.part_time_employment)}</td>
                          <td className="px-5 py-3 text-right font-medium text-gray-800">{pct(row.overall_positive_rate)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
