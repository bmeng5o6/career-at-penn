"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";

type InternshipStats = {
  record_count: number;
  unique_companies: number;
  year_range: {
    min: number;
    max: number;
  };
  compensation: {
    median_hourly: number | null;
    records_with_compensation: number;
  };
  data_basis: {
    projected: number;
    inferred: number;
    actual: number;
  };
  school?: string;
};

type EmployerRow = {
  company: string;
  school: string;
  year: number | null;
  penn_intern_count: number | null;
  hourly_median: number | null;
  monthly_estimate: number | null;
  compensation_source: string | null;
  data_basis: string | null;
  levels_fyi_entries: number | null;
};

type IndustryRow = {
  industry: string;
  percentage: number;
  school: string;
  year: number | null;
  is_projected: boolean | null;
};

type ListingRow = {
  company: string;
  role: string;
  major: string;
  school: string;
  class_year: string | null;
  count: number | null;
};

type Meta = {
  total?: number | null;
  limit?: number;
  offset?: number;
  has_more?: boolean;
};

type Filters = {
  school: string;
  year: string;
  company: string;
  dataBasis: string;
  projectedOnly: boolean;
};

const PREVIEW_STATS: InternshipStats = {
  record_count: 412,
  unique_companies: 128,
  year_range: {
    min: 2022,
    max: 2025,
  },
  compensation: {
    median_hourly: 38,
    records_with_compensation: 215,
  },
  data_basis: {
    projected: 84,
    inferred: 97,
    actual: 231,
  },
};

const PREVIEW_EMPLOYERS: EmployerRow[] = [
  {
    company: "Susquehanna (SIG)",
    school: "SEAS",
    year: 2025,
    penn_intern_count: 34,
    hourly_median: 57,
    monthly_estimate: 9880,
    compensation_source: "levels.fyi",
    data_basis: "actual",
    levels_fyi_entries: 100,
  },
  {
    company: "Citadel Securities",
    school: "Wharton",
    year: 2025,
    penn_intern_count: 31,
    hourly_median: 60,
    monthly_estimate: 10400,
    compensation_source: "levels.fyi",
    data_basis: "actual",
    levels_fyi_entries: 100,
  },
  {
    company: "Comcast",
    school: "All schools",
    year: 2024,
    penn_intern_count: 45,
    hourly_median: 32,
    monthly_estimate: 5540,
    compensation_source: "inferred",
    data_basis: "inferred",
    levels_fyi_entries: null,
  },
  {
    company: "CHOP",
    school: "Nursing",
    year: 2024,
    penn_intern_count: 34,
    hourly_median: 29,
    monthly_estimate: 5030,
    compensation_source: "projected",
    data_basis: "projected",
    levels_fyi_entries: null,
  },
];

const PREVIEW_INDUSTRIES: IndustryRow[] = [
  { industry: "Quantitative Trading", percentage: 24.5, school: "SEAS", year: 2025, is_projected: false },
  { industry: "Finance", percentage: 19.2, school: "Wharton", year: 2025, is_projected: false },
  { industry: "Technology", percentage: 17.8, school: "SEAS", year: 2025, is_projected: false },
  { industry: "Healthcare", percentage: 14.4, school: "Nursing", year: 2024, is_projected: false },
  { industry: "Consulting", percentage: 12.6, school: "CAS", year: 2025, is_projected: false },
  { industry: "Media", percentage: 8.3, school: "CAS", year: 2024, is_projected: false },
];

const PREVIEW_LISTINGS: ListingRow[] = [
  {
    company: "Susquehanna (SIG)",
    role: "Software Engineering Intern",
    major: "CIS",
    school: "SEAS",
    class_year: "2026",
    count: 12,
  },
  {
    company: "Citadel Securities",
    role: "Quantitative Research Intern",
    major: "Math",
    school: "SEAS",
    class_year: "2026",
    count: 8,
  },
  {
    company: "Comcast",
    role: "Business Analyst Intern",
    major: "Economics",
    school: "CAS",
    class_year: "2027",
    count: 7,
  },
  {
    company: "CHOP",
    role: "Healthcare Strategy Intern",
    major: "Biology",
    school: "Nursing",
    class_year: "2026",
    count: 6,
  },
];

const initialFilters: Filters = {
  school: "",
  year: "",
  company: "",
  dataBasis: "",
  projectedOnly: false,
};

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

function formatCurrency(value: number | null, unit: "hour" | "month") {
  if (value == null) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value) + `/${unit}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatBasis(value: string | null) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function matchesFilters(
  value: { school?: string | null; year?: number | null; company?: string | null; data_basis?: string | null },
  filters: {
    school: string;
    year: string;
    company: string;
    dataBasis: string;
  }
) {
  const matchesSchool = !filters.school || value.school === filters.school;
  const matchesYear = !filters.year || String(value.year ?? "") === filters.year;
  const matchesCompany =
    !filters.company ||
    (value.company ?? "").toLowerCase().includes(filters.company.toLowerCase());
  const matchesBasis = !filters.dataBasis || value.data_basis === filters.dataBasis;

  return matchesSchool && matchesYear && matchesCompany && matchesBasis;
}

function buildPreviewStats(employers: EmployerRow[]): InternshipStats {
  const hourlyRates = employers
    .map((row) => row.hourly_median)
    .filter((value): value is number => value != null && value > 0);
  const years = employers
    .map((row) => row.year)
    .filter((value): value is number => value != null);
  const uniqueCompanies = new Set(employers.map((row) => row.company)).size;

  const sortedRates = [...hourlyRates].sort((a, b) => a - b);
  const mid = Math.floor(sortedRates.length / 2);
  const median =
    sortedRates.length === 0
      ? null
      : sortedRates.length % 2
        ? sortedRates[mid]
        : (sortedRates[mid - 1] + sortedRates[mid]) / 2;

  return {
    record_count: employers.length,
    unique_companies: uniqueCompanies,
    year_range: {
      min: years.length ? Math.min(...years) : PREVIEW_STATS.year_range.min,
      max: years.length ? Math.max(...years) : PREVIEW_STATS.year_range.max,
    },
    compensation: {
      median_hourly: median,
      records_with_compensation: hourlyRates.length,
    },
    data_basis: {
      projected: employers.filter((row) => row.data_basis === "projected").length,
      inferred: employers.filter((row) => row.data_basis === "inferred").length,
      actual: employers.filter((row) => row.data_basis === "actual").length,
    },
  };
}

export default function InternshipExplorer() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [schools, setSchools] = useState<string[]>([]);

  const [stats, setStats] = useState<InternshipStats | null>(null);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [employerMeta, setEmployerMeta] = useState<Meta | null>(null);
  const [listingMeta, setListingMeta] = useState<Meta | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const deferredCompany = useDeferredValue(filters.company);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSchools() {
      try {
        const payload = await fetchJson<{ schools: string[] }>(
          "/api/internships/schools",
          controller.signal
        );
        startTransition(() => {
          setSchools(payload.schools.filter(Boolean));
        });
      } catch {
        startTransition(() => {
          setSchools([...new Set(PREVIEW_EMPLOYERS.map((row) => row.school).filter(Boolean))]);
        });
      }
    }

    void loadSchools();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError(null);

      const activeFilters = {
        school: filters.school,
        year: filters.year,
        company: deferredCompany.trim(),
        dataBasis: filters.dataBasis,
        projectedOnly: filters.projectedOnly,
      };

      try {
        const statsQuery = buildQuery({
          school: activeFilters.school,
        });

        const employerQuery = buildQuery({
          school: activeFilters.school,
          year: activeFilters.year,
          company: activeFilters.company,
          data_basis: activeFilters.dataBasis,
          is_projected: activeFilters.projectedOnly || undefined,
          limit: 12,
        });

        const industryQuery = buildQuery({
          school: activeFilters.school,
          year: activeFilters.year,
          is_projected: activeFilters.projectedOnly || undefined,
        });

        const listingsQuery = buildQuery({
          school: activeFilters.school,
          company: activeFilters.company,
          sort_by: "count",
          order: "desc",
          limit: 8,
        });

        const [statsPayload, employersPayload, industriesPayload, listingsPayload] =
          await Promise.all([
            fetchJson<{ stats: InternshipStats }>(
              `/api/internships/stats${statsQuery}`,
              controller.signal
            ),
            fetchJson<{ data: EmployerRow[]; meta: Meta }>(
              `/api/internships${employerQuery}`,
              controller.signal
            ),
            fetchJson<{ data: IndustryRow[]; meta: Meta }>(
              `/api/internships/industries${industryQuery}`,
              controller.signal
            ),
            fetchJson<{ data: ListingRow[]; meta: Meta }>(
              `/api/internships/listings${listingsQuery}`,
              controller.signal
            ),
          ]);

        startTransition(() => {
          setStats(statsPayload.stats);
          setEmployers(employersPayload.data);
          setIndustries(industriesPayload.data.slice(0, 6));
          setListings(listingsPayload.data);
          setEmployerMeta(employersPayload.meta);
          setListingMeta(listingsPayload.meta);
          setPreviewMode(false);
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const previewEmployers = PREVIEW_EMPLOYERS.filter((row) =>
          matchesFilters(row, activeFilters)
        );
        const previewIndustries = PREVIEW_INDUSTRIES.filter((row) => {
          const matchesSchool = !activeFilters.school || row.school === activeFilters.school;
          const matchesYear = !activeFilters.year || String(row.year ?? "") === activeFilters.year;
          return matchesSchool && matchesYear;
        });
        const previewListings = PREVIEW_LISTINGS.filter((row) => {
          const matchesSchool = !activeFilters.school || row.school === activeFilters.school;
          const matchesCompany =
            !activeFilters.company ||
            row.company.toLowerCase().includes(activeFilters.company.toLowerCase());
          return matchesSchool && matchesCompany;
        });

        startTransition(() => {
          setStats(buildPreviewStats(previewEmployers));
          setEmployers(previewEmployers);
          setIndustries(previewIndustries);
          setListings(previewListings);
          setEmployerMeta({ total: previewEmployers.length });
          setListingMeta({ total: previewListings.length });
          setPreviewMode(true);
        });
        setError(null);
      } finally {
        setLoading(false);
      }
    }

    void loadData();

    return () => controller.abort();
  }, [
    deferredCompany,
    filters.dataBasis,
    filters.projectedOnly,
    filters.school,
    filters.year,
  ]);

  const currentLens = [
    filters.school || "All schools",
    filters.year || "All years",
    filters.dataBasis || "Any basis",
    filters.projectedOnly ? "Projected only" : "Projected + actual",
  ].join(" • ");

  const statCards = [
    {
      label: "Employer records",
      value: stats?.record_count?.toLocaleString() ?? "--",
      tone: "from-slate-900 to-slate-800 text-white",
    },
    {
      label: "Unique companies",
      value: stats?.unique_companies?.toLocaleString() ?? "--",
      tone: "from-amber-100 to-yellow-50 text-slate-900",
    },
    {
      label: "Median internship pay",
      value: stats ? formatCurrency(stats.compensation.median_hourly, "hour") : "--",
      tone: "from-white to-slate-100 text-slate-900",
    },
    {
      label: "Coverage window",
      value:
        stats && Number.isFinite(stats.year_range.min) && Number.isFinite(stats.year_range.max)
          ? `${stats.year_range.min} - ${stats.year_range.max}`
          : "--",
      tone: "from-[#dbe7ff] to-white text-slate-900",
    },
  ];

  return (
    <section className="bg-[#f1f1f1] px-6 py-12 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-[#0d1b4b] md:text-5xl">
            Internship Intelligence
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-gray-500">
            Crowd-sourced Penn internship data, organized into a clean employer view using only
            the fields currently available in your API.
          </p>
          {previewMode ? (
            <div className="mt-4 inline-flex rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Preview mode: showing local sample values shaped like your current backend fields.
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_0.9fr_0.9fr_0.9fr_auto]">
            <input
              value={filters.company}
              onChange={(event) =>
                setFilters((current) => ({ ...current, company: event.target.value }))
              }
              placeholder="search any company..."
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a2a6c]"
            />

            <select
              value={filters.school}
              onChange={(event) =>
                setFilters((current) => ({ ...current, school: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a2a6c]"
            >
              <option value="">All schools</option>
              {schools.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>

            <input
              value={filters.year}
              onChange={(event) =>
                setFilters((current) => ({ ...current, year: event.target.value }))
              }
              inputMode="numeric"
              placeholder="Year"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a2a6c]"
            />

            <select
              value={filters.dataBasis}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dataBasis: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a2a6c]"
            >
              <option value="">All basis</option>
              <option value="actual">Actual</option>
              <option value="inferred">Inferred</option>
              <option value="projected">Projected</option>
            </select>

            <button
              type="button"
              onClick={() => setFilters(initialFilters)}
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <label className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={filters.projectedOnly}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    projectedOnly: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-[#1a2a6c] focus:ring-[#1a2a6c]"
              />
              <span>Projected compensation only</span>
            </label>

            <span className="rounded-full border border-gray-300 bg-white px-3 py-2">
              {currentLens}
            </span>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-[1.75rem] border border-gray-300 p-5 shadow-sm ${card.tone}`}
            >
              <p className="text-sm opacity-75">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0d1b4b]">Employer Snapshot</h2>
              <p className="mt-1 text-base text-gray-500">
                Professional, searchable cards built from the current employer data only.
              </p>
            </div>
            <div className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
              {employerMeta?.total ?? 0} employer rows
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {loading ? (
              <div className="rounded-[1.75rem] border border-gray-300 bg-white p-6 text-sm text-gray-500 shadow-sm">
                Loading employer records...
              </div>
            ) : employers.length ? (
              employers.map((row) => (
                <article
                  key={`${row.company}-${row.school}-${row.year ?? "na"}`}
                  className="rounded-[1.75rem] border border-gray-400 bg-white p-6 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">{row.company}</h3>
                      <p className="mt-1 text-lg text-gray-500">
                        {row.school}
                        {row.year ? ` · ${row.year}` : ""}
                      </p>
                    </div>
                    {row.levels_fyi_entries != null ? (
                      <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-500 shadow-sm">
                        {row.levels_fyi_entries} entries
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10">
                    <div>
                      <p className="text-sm text-gray-500">Penn Interns</p>
                      <p className="mt-2 text-4xl font-light text-gray-900">
                        {row.penn_intern_count ?? "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Hourly Median</p>
                      <p className="mt-2 text-4xl font-light text-gray-900">
                        {row.hourly_median != null
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(row.hourly_median)
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Monthly Estimate</p>
                      <p className="mt-2 text-4xl font-light text-gray-900">
                        {row.monthly_estimate != null
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(row.monthly_estimate)
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data Basis</p>
                      <p className="mt-2 text-4xl font-light text-gray-900">
                        {formatBasis(row.data_basis)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-300 bg-white px-4 py-1 text-sm text-gray-500 shadow-sm">
                        {row.school}
                      </span>
                      {row.compensation_source ? (
                        <span className="rounded-full border border-gray-300 bg-white px-4 py-1 text-sm text-gray-500 shadow-sm">
                          {row.compensation_source}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-500">{formatBasis(row.data_basis)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-gray-300 bg-white p-6 text-sm text-gray-500 shadow-sm">
                No employer rows match these filters.
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[1.75rem] border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#0d1b4b]">Industry Breakdown</h2>
            <p className="mt-1 text-base text-gray-500">
              Ordered by percentage from the existing `industry_breakdown` data.
            </p>

            <div className="mt-6 space-y-5">
              {loading ? (
                <p className="text-sm text-gray-500">Loading industry breakdown...</p>
              ) : industries.length ? (
                industries.map((row) => (
                  <div key={`${row.industry}-${row.school}-${row.year ?? "na"}`}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">{row.industry}</span>
                      <span className="text-gray-500">{formatPercent(row.percentage)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1a2a6c] to-[#4a66c7]"
                        style={{ width: `${Math.min(row.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No industry data matches these filters.</p>
              )}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Actual</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {stats?.data_basis.actual ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Inferred</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {stats?.data_basis.inferred ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Projected</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {stats?.data_basis.projected ?? 0}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-gray-300 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#0d1b4b]">Major Listings</h2>
                <p className="mt-1 text-base text-gray-500">
                  Company, role, major, school, class year, and listing count from `major_listings`.
                </p>
              </div>
              <span className="text-sm text-gray-500">
                Showing {listings.length} of {listingMeta?.total ?? 0}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-sm text-gray-500">Loading major listings...</p>
              ) : listings.length ? (
                listings.map((row, index) => (
                  <article
                    key={`${row.company}-${row.role}-${row.major}-${row.school}-${row.class_year ?? "na"}-${row.count ?? "na"}-${index}`}
                    className="rounded-3xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{row.company}</p>
                        <p className="mt-1 text-sm text-gray-600">{row.role}</p>
                      </div>
                      <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-500">
                        {row.count ?? 0} listed
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-500">
                        {row.major}
                      </span>
                      <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-500">
                        {row.school}
                      </span>
                      {row.class_year ? (
                        <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-500">
                          {row.class_year}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-gray-500">No major listings match these filters.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
