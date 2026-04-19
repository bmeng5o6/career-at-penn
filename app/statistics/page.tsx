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

interface MajorStats {
  major: string | null;
  school: string | null;
  company: string | null;
  total_listings: number;
  unique_companies: number;
  unique_majors: number;
  unique_roles: number;
  top_companies: { company: string; count: number }[];
  top_majors: { major: string; count: number }[];
  top_roles: { role: string; count: number }[];
  class_year_breakdown: { class_year: string; count: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "full_time_employment",  label: "Full-Time Employment" },
  { key: "continuing_education",  label: "Continuing Education" },
  { key: "seeking_employment",    label: "Seeking Employment" },
  { key: "part_time_employment",  label: "Part-Time Employment" },
  { key: "overall_positive_rate", label: "Overall Positive Rate" },
];

const SCHOOL_COLORS: Record<string, string> = {
  Wharton: "#1a2a6c",
  SEAS:    "#e63946",
  CAS:     "#2a9d8f",
  Nursing: "#e76f51",
};

const MAJOR_BAR_COLOR = "#1a2a6c";
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

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm max-w-xs">
      <p className="font-semibold text-gray-700 mb-1 truncate">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{typeof p.value === "number" && p.value < 2 ? pct(p.value / 100) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ label, active, color, onClick }: {
  label: string; active: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
        active ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
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

// ── OUTCOMES TAB ──────────────────────────────────────────────────────────────

function OutcomesTab() {
  const supabase = createClient();
  const [allData, setAllData] = useState<OutcomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(ALL_SCHOOLS);
  const [yearFrom, setYearFrom] = useState<number | "">("");
  const [yearTo,   setYearTo]   = useState<number | "">("");
  const [metric,   setMetric]   = useState<MetricKey>("full_time_employment");

  useEffect(() => {
    supabase.from("penn_outcomes").select("*").order("class_year", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setAllData(data as OutcomeRow[]);
        setLoading(false);
      });
  }, []);

  const years = useMemo(() => [...new Set(allData.map((r) => r.class_year))].sort(), [allData]);

  const filtered = useMemo(() => allData.filter((r) => {
    if (selectedSchools.length && !selectedSchools.includes(r.school)) return false;
    if (yearFrom !== "" && r.class_year < yearFrom) return false;
    if (yearTo   !== "" && r.class_year > yearTo)   return false;
    return true;
  }), [allData, selectedSchools, yearFrom, yearTo]);

  const lineData = useMemo(() =>
    years
      .filter((y) => (yearFrom === "" || y >= yearFrom) && (yearTo === "" || y <= yearTo))
      .map((year) => {
        const entry: Record<string, number | string> = { year };
        for (const school of selectedSchools) {
          const row = allData.find((r) => r.school === school && r.class_year === year);
          const val = row?.[metric];
          if (val != null) entry[school] = +(val * 100).toFixed(1);
        }
        return entry;
      }),
    [allData, years, selectedSchools, metric, yearFrom, yearTo]);

  const barData = useMemo(() =>
    METRICS.map(({ key, label }) => {
      const entry: Record<string, string | number> = { metric: label };
      for (const school of selectedSchools) {
        const rows = filtered.filter((r) => r.school === school);
        const a = avg(rows, key);
        if (a != null) entry[school] = +(a * 100).toFixed(1);
      }
      return entry;
    }),
    [filtered, selectedSchools]);

  const summary = useMemo(() => ({
    employment: avg(filtered, "full_time_employment"),
    gradSchool: avg(filtered, "continuing_education"),
    seeking:    avg(filtered, "seeking_employment"),
    positive:   avg(filtered, "overall_positive_rate"),
    records:    filtered.length,
  }), [filtered]);

  function toggleSchool(school: string) {
    setSelectedSchools((prev) =>
      prev.includes(school)
        ? prev.length > 1 ? prev.filter((s) => s !== school) : prev
        : [...prev, school]
    );
  }

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric;

  return (
    <>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
        <div className="flex flex-wrap gap-6 items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">School</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_SCHOOLS.map((s) => (
                <Pill key={s} label={s} active={selectedSchools.includes(s)} color={SCHOOL_COLORS[s]} onClick={() => toggleSchool(s)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Year Range</p>
            <div className="flex items-center gap-2">
              <select value={yearFrom} onChange={(e) => setYearFrom(e.target.value === "" ? "" : +e.target.value)}
                className="text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]">
                <option value="">From</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-gray-400">–</span>
              <select value={yearTo} onChange={(e) => setYearTo(e.target.value === "" ? "" : +e.target.value)}
                className="text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]">
                <option value="">To</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {(yearFrom !== "" || yearTo !== "") && (
                <button onClick={() => { setYearFrom(""); setYearTo(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Metric (Trend Chart)</p>
            <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}
              className="text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]">
              {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
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
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Avg Full-Time Employment" value={pct(summary.employment)} sub={`${summary.records} records`} />
            <StatCard label="Avg Continuing Education" value={pct(summary.gradSchool)} />
            <StatCard label="Avg Seeking Employment"   value={pct(summary.seeking)} />
            <StatCard label="Avg Positive Outcome"     value={pct(summary.positive)} />
          </div>

          {/* Line chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-1">{metricLabel} Over Time</h2>
            <p className="text-xs text-gray-400 mb-6">One line per selected school, by class year</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                {selectedSchools.map((school) => (
                  <Line key={school} type="monotone" dataKey={school}
                    stroke={SCHOOL_COLORS[school] ?? "#888"} strokeWidth={2.5}
                    dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Outcome Breakdown by School</h2>
            <p className="text-xs text-gray-400 mb-6">Average across selected year range — all outcome categories</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} margin={{ top: 4, right: 24, left: 0, bottom: 60 }} barGap={4} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" />
                {selectedSchools.map((school) => (
                  <Bar key={school} dataKey={school} fill={SCHOOL_COLORS[school] ?? "#888"} radius={[3, 3, 0, 0]}>
                    {barData.map((_, i) => <Cell key={i} fill={SCHOOL_COLORS[school] ?? "#888"} />)}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Raw table */}
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
                  {filtered.slice().sort((a, b) => b.class_year - a.class_year || a.school.localeCompare(b.school)).map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: SCHOOL_COLORS[row.school] ?? "#888" }}>
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
    </>
  );
}

// ── MAJOR INSIGHTS TAB ────────────────────────────────────────────────────────

function MajorInsightsTab() {
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [majors,         setMajors]         = useState<string[]>([]);
  const [companies,      setCompanies]      = useState<string[]>([]);
  const [selectedMajor,  setSelectedMajor]  = useState<string>("");
  const [selectedCompany,setSelectedCompany]= useState<string>("");
  const [stats,          setStats]          = useState<MajorStats | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Load majors when school changes
  useEffect(() => {
    setLoadingFilters(true);
    setSelectedMajor("");
    setSelectedCompany("");
    setStats(null);
    const params = new URLSearchParams();
    if (selectedSchool) params.set("school", selectedSchool);
    fetch(`/api/majors?${params}`)
      .then((r) => r.json())
      .then((d) => { setMajors(d.majors ?? []); setLoadingFilters(false); });
  }, [selectedSchool]);

  // Load companies when school or major changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSchool) params.set("school", selectedSchool);
    if (selectedMajor)  params.set("major", selectedMajor);
    fetch(`/api/majors/companies?${params}`)
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []));
  }, [selectedSchool, selectedMajor]);

  // Fetch stats when major or company is selected
  useEffect(() => {
    if (!selectedMajor && !selectedCompany) { setStats(null); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedMajor)   params.set("major", selectedMajor);
    if (selectedSchool)  params.set("school", selectedSchool);
    if (selectedCompany) params.set("company", selectedCompany);
    fetch(`/api/majors/stats?${params}`)
      .then((r) => r.json())
      .then((d) => { setStats(d.error ? null : d); setLoading(false); });
  }, [selectedMajor, selectedSchool, selectedCompany]);

  const companyChartData = stats?.top_companies.map((c) => ({ name: c.company, count: c.count })) ?? [];
  const majorChartData   = stats?.top_majors.map((m) => ({ name: m.major, count: m.count })) ?? [];
  const roleChartData    = stats?.top_roles.map((r) => ({ name: r.role, count: r.count })) ?? [];
  const classChartData   = stats?.class_year_breakdown.map((c) => ({ name: c.class_year, count: c.count })) ?? [];

  const showingByCompany = !!selectedCompany && !selectedMajor;

  return (
    <>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">

          {/* School */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">School</p>
            <div className="flex gap-2 flex-wrap">
              <Pill label="All" active={!selectedSchool} color="#6b7280" onClick={() => setSelectedSchool("")} />
              {ALL_SCHOOLS.map((s) => (
                <Pill key={s} label={s} active={selectedSchool === s} color={SCHOOL_COLORS[s]} onClick={() => setSelectedSchool(s)} />
              ))}
            </div>
          </div>

          {/* Major */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Major</p>
            <select value={selectedMajor} onChange={(e) => setSelectedMajor(e.target.value)}
              disabled={loadingFilters}
              className="text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[#1a2a6c] disabled:bg-gray-100 disabled:text-gray-500">
              <option value="">Select a major…</option>
              {majors.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Company</p>
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}
              className="text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 bg-gray-50 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]">
              <option value="">All companies</option>
              {companies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {(selectedMajor || selectedCompany || selectedSchool) && (
            <button onClick={() => { setSelectedMajor(""); setSelectedCompany(""); setSelectedSchool(""); setStats(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline self-end pb-2">
              Clear all
            </button>
          )}
        </div>
      </div>

      {!selectedMajor && !selectedCompany ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
          <p className="text-base">Select a major or company to see insights</p>
          <p className="text-sm">2,476 internship listings from Penn Summer Outcomes (2019)</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
      ) : !stats ? (
        <div className="flex items-center justify-center h-64 text-gray-400">No data found for those filters.</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Listings"     value={stats.total_listings.toString()} sub="2019 data" />
            <StatCard label="Unique Companies"   value={stats.unique_companies.toString()} />
            <StatCard label="Unique Roles"       value={stats.unique_roles.toString()} />
            {showingByCompany
              ? <StatCard label="Unique Majors"  value={stats.unique_majors.toString()} />
              : <StatCard label="Top Company"    value={stats.top_companies[0]?.company ?? "—"} sub={`${stats.top_companies[0]?.count ?? 0} listings`} />
            }
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Companies or Top Majors */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                {showingByCompany ? "Majors Hiring at This Company" : "Top Companies Hiring This Major"}
              </h2>
              <p className="text-xs text-gray-400 mb-4">By number of internship listings</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={showingByCompany ? majorChartData : companyChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis type="category" dataKey="name" width={160}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v} />
                  <Tooltip
                    formatter={(v) => [v, "Listings"]}
                    labelFormatter={(l) => l}
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}
                    labelStyle={{ color: "#4b5563" }}
                    itemStyle={{ color: "#1a2a6c" }}
                  />
                  <Bar dataKey="count" fill={MAJOR_BAR_COLOR} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Roles */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Top Roles</h2>
              <p className="text-xs text-gray-400 mb-4">Most common internship titles</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={roleChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis type="category" dataKey="name" width={160}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v} />
                  <Tooltip
                    formatter={(v) => [v, "Listings"]}
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}
                    labelStyle={{ color: "#4b5563" }}
                    itemStyle={{ color: "#2a9d8f" }}
                  />
                  <Bar dataKey="count" fill="#2a9d8f" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Class Year Breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Class Year Breakdown</h2>
            <p className="text-xs text-gray-400 mb-6">Which class years interned here</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classChartData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} width={36} />
                <Tooltip
                  formatter={(v) => [v, "Listings"]}
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}
                  labelStyle={{ color: "#4b5563" }}
                  itemStyle={{ color: "#c65d3d" }}
                />
                <Bar dataKey="count" fill="#e76f51" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

type Tab = "outcomes" | "majors";

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("outcomes");

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />
      <div className="max-w-6xl mx-auto py-10 px-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Penn Outcomes Statistics</h1>
          <p className="text-gray-500 mt-1">Post-graduation and internship data across Penn schools — filter and explore.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {([
            { key: "outcomes", label: "Post-Grad Outcomes" },
            { key: "majors",   label: "Major Insights" },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === key
                  ? "border-[#1a2a6c] text-[#1a2a6c]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "outcomes" ? <OutcomesTab /> : <MajorInsightsTab />}
      </div>
    </main>
  );
}
