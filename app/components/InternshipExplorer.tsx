"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";

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

type RoleEntry = { role: string; hourly_median: number; count: number };

type EmployerRow = {
  company: string;
  school: string;
  industry: string | null;
  year: number | null;
  penn_intern_count: number | null;
  hourly_median: number | null;
  monthly_estimate: number | null;
  compensation_source: string | null;
  data_basis: string | null;
  levels_fyi_entries: number | null;
  roles: RoleEntry[] | null;
  locations: string[] | null;
  salary_trend: Record<string, number> | null;
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
  industry: string;
  sortBy: string;
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
    industry: null, roles: null, locations: null, salary_trend: null,
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
    industry: null, roles: null, locations: null, salary_trend: null,
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
    industry: null, roles: null, locations: null, salary_trend: null,
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
    industry: null, roles: null, locations: null, salary_trend: null,
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
  year: "2026",
  company: "",
  industry: "",
  sortBy: "penn_intern_count:desc",
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
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [expandedLevelsFyi, setExpandedLevelsFyi] = useState<string | null>(null);
  const [companyListings, setCompanyListings] = useState<ListingRow[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({});
  const [showBreakdowns, setShowBreakdowns] = useState(true);
  const [majorFilter, setMajorFilter] = useState(""); // "" = All majors
  const [classYearFilter, setClassYearFilter] = useState(""); // "" = All years
  const [allListings, setAllListings] = useState<ListingRow[]>([]);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  const [listingOffset, setListingOffset] = useState(0);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const listingScrollRef = useRef<HTMLDivElement>(null);
  const LISTING_PAGE_SIZE = 50;
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
        industry: filters.industry,
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
          industry: activeFilters.industry,
          sort_by: filters.sortBy.split(":")[0],
          order: filters.sortBy.split(":")[1] || "desc",
          data_basis: activeFilters.dataBasis,
          is_projected: activeFilters.projectedOnly || undefined,
          limit: 100,
        });

        const industryQuery = buildQuery({
          school: activeFilters.school || "All",
          year: activeFilters.year,
          is_projected: activeFilters.projectedOnly || undefined,
        });

        const listingsQuery = buildQuery({
          school: activeFilters.school,
          company: activeFilters.company,
          major: majorFilter || undefined,
          class_year: classYearFilter || undefined,
          sort_by: "count",
          order: "desc",
          limit: LISTING_PAGE_SIZE,
          offset: 0,
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
          setAllListings(listingsPayload.data);
          setListingOffset(listingsPayload.data.length);
          setHasMoreListings((listingsPayload.meta?.total ?? 0) > listingsPayload.data.length);
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
    filters.industry,
    filters.sortBy,
    filters.year,
    majorFilter,
    classYearFilter,
  ]);

  // Fetch listing counts for all visible employer cards
  useEffect(() => {
    if (!employers.length) return;
    const seen = new Set<string>();
    const toFetch: { company: string; school: string; key: string }[] = [];
    for (const emp of employers) {
      const key = `${emp.company}-${emp.school}`;
      if (!seen.has(key)) {
        seen.add(key);
        toFetch.push({ company: emp.company, school: emp.school, key });
      }
    }
    Promise.all(
      toFetch.map(async ({ company, school, key }) => {
        try {
          const q = buildQuery({ company, school, limit: 1 });
          const res = await fetch(`/api/internships/listings${q}`);
          const json = await res.json();
          return [key, json.meta?.total ?? 0] as const;
        } catch {
          return [key, 0] as const;
        }
      })
    ).then((results) => {
      const counts: Record<string, number> = {};
      for (const [key, count] of results) counts[key] = count;
      setListingCounts(counts);
    });
  }, [employers]);

  const loadMoreListings = useCallback(async () => {
    if (loadingMoreListings || !hasMoreListings) return;
    setLoadingMoreListings(true);
    try {
      const q = buildQuery({
        school: filters.school,
        company: filters.company,
        major: majorFilter || undefined,
        class_year: classYearFilter || undefined,
        sort_by: "count",
        order: "desc",
        limit: LISTING_PAGE_SIZE,
        offset: listingOffset,
      });
      const res = await fetch(`/api/internships/listings${q}`);
      const json = await res.json();
      const newData = json.data ?? [];
      setAllListings((prev) => [...prev, ...newData]);
      setListingOffset((prev) => prev + newData.length);
      setHasMoreListings(newData.length >= LISTING_PAGE_SIZE);
    } catch {
      // ignore
    } finally {
      setLoadingMoreListings(false);
    }
  }, [loadingMoreListings, hasMoreListings, listingOffset, filters.school, filters.company, majorFilter, classYearFilter]);

  // Infinite scroll handler for listings
  const handleListingScroll = useCallback(() => {
    const el = listingScrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      loadMoreListings();
    }
  }, [loadMoreListings]);

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
      tone: "from-white to-slate-100 text-slate-900",
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
      value: filters.year || (
        stats && Number.isFinite(stats.year_range.min) && Number.isFinite(stats.year_range.max)
          ? `${stats.year_range.min} - ${stats.year_range.max}`
          : "--"
      ),
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
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-[1.4fr_1fr_0.6fr_1fr_1fr_0.8fr_auto]">
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

            <select
              value={filters.year}
              onChange={(event) =>
                setFilters((current) => ({ ...current, year: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a2a6c]"
            >
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            <select
              value={filters.industry}
              onChange={(event) =>
                setFilters((current) => ({ ...current, industry: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a2a6c]"
            >
              <option value="">All industries</option>
              <option value="Technology">Technology</option>
              <option value="Financial Services">Financial Services</option>
              <option value="Consulting">Consulting</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Nonprofit">Nonprofit</option>
              <option value="Media/Journalism/Entertainment">Media/Entertainment</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(event) =>
                setFilters((current) => ({ ...current, sortBy: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1a2a6c]"
            >
              <option value="penn_intern_count:desc">Penn Interns ↓</option>
              <option value="penn_intern_count:asc">Penn Interns ↑</option>
              <option value="hourly_median:desc">Hourly Estimate ↓</option>
              <option value="hourly_median:asc">Hourly Estimate ↑</option>
            </select>

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
              onClick={() => { setFilters(initialFilters); setAllListings([]); setListingOffset(0); setHasMoreListings(true); }}
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">

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

        {/* Collapsible Industry & Major Breakdowns */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#0d1b4b]">Industry & Major Breakdowns</h2>
            <button
              type="button"
              onClick={() => setShowBreakdowns(!showBreakdowns)}
              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${showBreakdowns ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50" : "border-[#1a2a6c] bg-[#1a2a6c] text-white hover:bg-[#253a8e]"}`}
            >
              {showBreakdowns ? "Collapse" : "Expand"}
            </button>
          </div>

          {showBreakdowns && (
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[1.75rem] border border-gray-300 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-[#0d1b4b]">Industry Breakdown</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Projected internship industry distribution by school
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
              </section>

              <section className="rounded-[1.75rem] border border-gray-300 bg-white p-6 shadow-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#0d1b4b]">Major Listings</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      2019 Penn internship placements by company
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {allListings.length} of {listingMeta?.total ?? 0}
                  </span>
                </div>
                <select
                  value={majorFilter}
                  onChange={(e) => {
                    setMajorFilter(e.target.value);
                    setAllListings([]);
                    setListingOffset(0);
                    setHasMoreListings(true);
                  }}
                  className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1a2a6c]"
                >
                  <option value="">All majors</option>
                  {["Accounting","Actuarial Science","Africana Studies","Ancient History","Anthropology",
                    "Applied Science: Biomedical Science","Applied Science: Computer Science",
                    "Applied Science: Computer and Cognitive Science","Architecture","Behavioral Economics",
                    "Biochemistry","Bioengineering","Biological Basis of Behavior","Biology",
                    "Biophysics","Business Analytics","Business Economics & Public Policy",
                    "Chemical and Biomolecular Engineering","Chemistry","Cinema and Media Studies",
                    "Classical Studies","Cognitive Science","Communication","Comparative Literature",
                    "Computer Engineering","Computer Science","Criminology","Digital Media Design",
                    "Earth Sciences","East Asian Area Studies","Economics","Electrical Engineering",
                    "English","Environmental Policy and Management","Environmental Studies",
                    "Fine Arts","French and Francophone Studies","German","Health & Societies",
                    "Health Care Management and Policy","Hispanic Studies","History","History of Art",
                    "Huntsman Program in International Studies and Business","International Relations",
                    "Jewish Studies","Latin American and Latino Studies","Legal Studies and Business Ethics",
                    "Linguistics","Logic Information and Computation","Management",
                    "Managing Electronic Commerce","Marketing","Marketing & Communication",
                    "Marketing & Operations Management","Materials Science and Engineering",
                    "Mathematical Economics","Mathematics","Mechanical Engineering and Applied Mechanics",
                    "Modern Middle Eastern Studies","Music","Near Eastern Languages",
                    "Near Eastern Languages & Civilization","Networked and Social Systems Engineering",
                    "Nursing Science","Nutrition Science","Operations Information & Decisions",
                    "Philosophy","Physics","Political Science","Psychology","Real Estate",
                    "Religious Studies","Retailing","Russian and East European Studies",
                    "Social Impact and Responsibility","Sociology","Statistics",
                    "Systems Science and Engineering","Theatre Arts","Urban Studies","Visual Studies"
                  ].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={classYearFilter}
                  onChange={(e) => {
                    setClassYearFilter(e.target.value);
                    setAllListings([]);
                    setListingOffset(0);
                    setHasMoreListings(true);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1a2a6c]"
                >
                  <option value="">All class years</option>
                  <option value="Rising Senior">Rising Senior</option>
                  <option value="Rising Junior">Rising Junior</option>
                  <option value="Rising Sophomore">Rising Sophomore</option>
                </select>

                <div
                  ref={listingScrollRef}
                  onScroll={handleListingScroll}
                  className="mt-6 space-y-4 max-h-[600px] overflow-y-auto"
                >
                  {loading ? (
                    <p className="text-sm text-gray-500">Loading major listings...</p>
                  ) : allListings.length ? (() => {
                    // Group by company
                    const grouped: Record<string, typeof allListings> = {};
                    allListings.forEach((row) => {
                      (grouped[row.company] ??= []).push(row);
                    });
                    return Object.entries(grouped)
                      .sort((a, b) => b[1].reduce((s, r) => s + (r.count ?? 1), 0) - a[1].reduce((s, r) => s + (r.count ?? 1), 0))
                      .map(([company, rows]) => {
                        // Group roles within company by role name
                        const byRole: Record<string, { majors: Set<string>; classYears: Set<string>; schools: Set<string>; count: number }> = {};
                        rows.forEach((row) => {
                          const key = row.role;
                          if (!byRole[key]) byRole[key] = { majors: new Set(), classYears: new Set(), schools: new Set(), count: 0 };
                          byRole[key].majors.add(row.major);
                          if (row.class_year) byRole[key].classYears.add(row.class_year);
                          byRole[key].schools.add(row.school);
                          byRole[key].count += row.count ?? 1;
                        });
                        const totalCount = rows.reduce((sum, r) => sum + (r.count ?? 1), 0);

                        return (
                          <article
                            key={company}
                            className="rounded-3xl border border-gray-200 bg-gray-50 p-5"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-lg font-semibold text-gray-900">{company}</p>
                              <span className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-500">
                                {totalCount} placements
                              </span>
                            </div>

                            <div className="mt-4 divide-y divide-gray-200">
                              {Object.entries(byRole)
                                .sort((a, b) => b[1].count - a[1].count)
                                .map(([role, info]) => (
                                <div key={role} className="py-3 first:pt-0 last:pb-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-800">{role}</span>
                                    {info.count > 1 && (
                                      <span className="text-xs text-gray-400">×{info.count}</span>
                                    )}
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {[...info.majors].map((m) => (
                                      <span key={m} className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-600">{m}</span>
                                    ))}
                                    {[...info.schools].map((s) => (
                                      <span key={s} className="rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-500">{s}</span>
                                    ))}
                                    {[...info.classYears].sort().map((cy) => (
                                      <span key={cy} className="rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs text-amber-600">{cy}</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </article>
                        );
                      });
                  })() : (
                    <p className="text-sm text-gray-500">No major listings match these filters.</p>
                  )}
                </div>

                {loadingMoreListings && (
                  <p className="mt-3 text-center text-sm text-gray-400">Loading more...</p>
                )}
                {!hasMoreListings && allListings.length > 0 && (
                  <p className="mt-3 text-center text-xs text-gray-400">All listings loaded</p>
                )}
              </section>
            </div>
          )}
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
                        {row.industry ? ` · ${row.industry}` : ""}
                        {row.year ? ` · ${row.year}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10">
                    <div>
                      <p className="text-sm text-gray-500">Penn Interns</p>
                      <p className="mt-2 text-4xl font-light text-gray-900">
                        {row.penn_intern_count ?? "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Hourly Estimate</p>
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
                  </div>

                  <div className="mt-8 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="shrink-0 rounded-full border border-gray-300 bg-white px-4 py-1 text-sm text-gray-500 shadow-sm">
                        {row.school}
                      </span>
                      {row.industry && (
                        <span className="shrink-0 rounded-full border border-purple-200 bg-purple-50 px-4 py-1 text-sm text-purple-600 shadow-sm">
                          {row.industry}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const key = `${row.company}-${row.school}`;
                          if (expandedCompany === key) {
                            setExpandedCompany(null);
                            return;
                          }
                          setLoadingListings(true);
                          setExpandedCompany(key);
                          try {
                            const query = buildQuery({ company: row.company, school: row.school, limit: 50 });
                            const res = await fetch(`/api/internships/listings${query}`);
                            const json = await res.json();
                            setCompanyListings(json.data ?? []);
                          } catch {
                            setCompanyListings([]);
                          } finally {
                            setLoadingListings(false);
                          }
                        }}
                        className="shrink-0 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm text-blue-600 shadow-sm transition hover:bg-blue-100"
                      >
                        {`2019 Penn listings${listingCounts[`${row.company}-${row.school}`] != null ? ` (${listingCounts[`${row.company}-${row.school}`]})` : ""}`}
                      </button>
                      {row.roles && row.roles.length > 0 && !/penn/i.test(row.company) && !/university of pennsylvania/i.test(row.company) && (
                        <button
                          type="button"
                          onClick={() => {
                            const key = `${row.company}-${row.school}`;
                            setExpandedLevelsFyi(expandedLevelsFyi === key ? null : key);
                          }}
                          className="shrink-0 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm text-emerald-600 shadow-sm transition hover:bg-emerald-100"
                        >
                          Levels.fyi ({row.roles.length})
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 text-right">{formatBasis(row.data_basis)}</p>
                  </div>

                  {expandedCompany === `${row.company}-${row.school}` && (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      {loadingListings ? (
                        <p className="text-sm text-gray-500">Loading...</p>
                      ) : companyListings.length > 0 ? (() => {
                        const byMajor: Record<string, typeof companyListings> = {};
                        companyListings.forEach((l) => {
                          const key = l.major || "Other";
                          (byMajor[key] ??= []).push(l);
                        });
                        return (
                          <div>
                            <div className="space-y-4">
                              {Object.entries(byMajor)
                                .sort((a, b) => b[1].reduce((s, r) => s + (r.count ?? 1), 0) - a[1].reduce((s, r) => s + (r.count ?? 1), 0))
                                .map(([major, majorListings]) => (
                                <div key={major}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-semibold text-gray-800">{major}</span>
                                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                                      {majorListings.length}
                                    </span>
                                  </div>
                                  <div className="ml-3 space-y-1.5">
                                    {majorListings.map((listing, i) => (
                                      <div key={i} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{listing.role}</span>
                                        {listing.class_year && (
                                          <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-500">
                                            {listing.class_year}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })() : (
                        <p className="text-sm text-gray-500">No Penn intern listings found for this company.</p>
                      )}
                    </div>
                  )}

                  {expandedLevelsFyi === `${row.company}-${row.school}` && row.roles && (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <div className="space-y-5">
                        {/* Roles */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Intern roles & pay</p>
                          <div className="space-y-2">
                            {row.roles.map((r, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800">{r.role}</span>
                                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">{r.count} reports</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">
                                  ${Math.round(r.hourly_median)}/hr
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Locations */}
                        {row.locations && row.locations.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Intern locations</p>
                            <div className="flex flex-wrap gap-2">
                              {row.locations.slice(0, 8).map((loc, i) => (
                                <span key={i} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                                  {loc}
                                </span>
                              ))}
                              {row.locations.length > 8 && (
                                <span className="text-xs text-gray-400">+{row.locations.length - 8} more</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Salary Trend */}
                        {row.salary_trend && Object.keys(row.salary_trend).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pay trend</p>
                            <div className="flex flex-wrap gap-3">
                              {Object.entries(row.salary_trend)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([yr, val]) => (
                                <div key={yr} className="text-center">
                                  <p className="text-xs text-gray-400">{yr}</p>
                                  <p className="text-sm font-semibold text-gray-800">${Math.round(Number(val))}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-gray-300 bg-white p-6 text-sm text-gray-500 shadow-sm">
                No employer rows match these filters.
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
