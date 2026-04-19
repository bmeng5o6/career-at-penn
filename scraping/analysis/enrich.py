"""
Enrichment: cross-reference projected Penn internship data with Levels.fyi compensation.

For each Penn employer, attaches:
- Role-specific compensation (SWE vs PM vs Data Science etc.)
- Multiple locations
- Year-over-year salary trends
- Data point count

Also loads per-major job listings from Summer Outcomes PDFs.

Usage:
    python -m analysis.enrich
"""

import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

from rapidfuzz import fuzz, process

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import COMPANY_ALIASES, COMPANY_INDUSTRIES
from db import export_json
from utils import normalize_company

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"


def _load_json(filename: str) -> dict | list:
    path = OUTPUT_DIR / filename
    if not path.exists():
        print(f"  WARNING: {path} not found. Run the relevant step first.")
        return {}
    with open(path) as f:
        return json.load(f)


def _build_rich_levels_lookup(levels_data: list[dict]) -> dict[str, dict]:
    """Build company→rich compensation data from Levels.fyi.

    Instead of just a median, includes:
    - Role-specific pay (SWE, PM, Data Science, etc.)
    - All locations
    - Year-over-year trend
    - Total data points
    """
    companies: dict[str, dict] = {}

    for entry in levels_data:
        company = entry.get("company")
        comp = entry.get("compensation_amount")
        comp_type = entry.get("compensation_type")
        if not company or not comp:
            continue

        hourly = float(comp)
        if comp_type == "monthly" and hourly > 200:
            hourly = hourly / (40 * 4.33)
        if hourly < 1 or hourly > 200:
            continue

        if company not in companies:
            companies[company] = {
                "all_hourly": [],
                "by_role": defaultdict(list),
                "locations": set(),
                "by_year": defaultdict(list),
            }

        c = companies[company]
        c["all_hourly"].append(hourly)

        role = entry.get("role") or "Intern"
        c["by_role"][role].append(hourly)

        loc = entry.get("location")
        if loc:
            c["locations"].add(loc)

        year = entry.get("year")
        if year:
            c["by_year"][int(year)].append(hourly)

    # Build final lookup
    lookup = {}
    for company, c in companies.items():
        all_h = c["all_hourly"]
        median_h = statistics.median(all_h)

        # Role breakdown: median per role, sorted by count
        roles = []
        for role, salaries in sorted(c["by_role"].items(), key=lambda x: -len(x[1])):
            roles.append({
                "role": role,
                "hourly_median": round(statistics.median(salaries), 0),
                "count": len(salaries),
            })

        # Year trend: median per year
        trend = {}
        for year, salaries in sorted(c["by_year"].items()):
            trend[year] = round(statistics.median(salaries), 0)

        # Top locations by frequency
        loc_list = list(c["locations"])

        lookup[company] = {
            "company": company,
            "hourly_median": round(median_h, 2),
            "monthly_estimate": round(median_h * 40 * 4.33, 0),
            "entry_count": len(all_h),
            "roles": roles[:6],  # top 6 roles
            "locations": loc_list[:8],  # top 8 locations
            "salary_trend": trend,
        }

    return lookup


def _build_industry_medians(levels_data: list[dict]) -> dict:
    """Build overall compensation stats as fallback."""
    all_hourly = []
    for entry in levels_data:
        comp = entry.get("compensation_amount")
        comp_type = entry.get("compensation_type")
        if not comp:
            continue
        hourly = float(comp)
        if comp_type == "monthly" and hourly > 200:
            hourly = hourly / (40 * 4.33)
        if 1 < hourly < 200:
            all_hourly.append(hourly)

    if not all_hourly:
        return {"median_hourly": 30, "median_monthly": 5196}

    median = statistics.median(all_hourly)
    return {
        "median_hourly": round(median, 2),
        "median_monthly": round(median * 40 * 4.33, 0),
        "total_entries": len(all_hourly),
    }


def _fuzzy_match(company: str, levels_lookup: dict[str, dict], threshold: int = 70) -> dict | None:
    """Fuzzy match a Penn employer name against Levels.fyi companies."""
    if company in levels_lookup:
        return levels_lookup[company]
    normalized = normalize_company(company)
    if normalized in levels_lookup:
        return levels_lookup[normalized]
    candidates = list(levels_lookup.keys())
    match = process.extractOne(company, candidates, scorer=fuzz.ratio, score_cutoff=threshold)
    if match:
        return levels_lookup[match[0]]
    return None


def _load_major_listings(summer_data: dict) -> list[dict]:
    """Extract per-major job listings from Summer Outcomes school-specific PDFs.

    These are individual entries like:
    'Computer Science' major → 'Google, Software Engineering Intern [Rising Senior]'
    """
    import re
    import pdfplumber

    PDF_DIR = OUTPUT_DIR / "pdfs"
    listings = []

    school_files = {
        "SEAS": "summer_SEAS_2019.pdf",
        "Wharton": "summer_Wharton_2019.pdf",
        "CAS": "summer_CAS_2019.pdf",
    }

    for school, filename in school_files.items():
        pdf_path = PDF_DIR / filename
        if not pdf_path.exists():
            continue

        with pdfplumber.open(pdf_path) as pdf:
            current_major = None
            in_listings_section = False

            for page in pdf.pages:
                text = page.extract_text() or ""

                # Detect start of listings section
                if "Internships & Jobs by" in text:
                    in_listings_section = True

                if not in_listings_section:
                    continue

                for line in text.split("\n"):
                    line = line.strip()
                    if not line or len(line) < 3:
                        continue

                    # Skip page headers and legend
                    if any(kw in line for kw in ["SUMMER 2019", "Internships & Jobs by", "+ Rising Senior", "* Rising Junior", "○ Rising Sophomore"]):
                        continue

                    # Detect major headers: lines that are just a major name
                    # (no comma separating company/title, no +/*/ markers)
                    if (
                        not any(c in line for c in [",", "+", "*", "○"])
                        and len(line) < 60
                        and not line[0].isdigit()
                    ):
                        current_major = line
                        continue

                    # Parse job listing: "Company, Title +/*/ "
                    if current_major and "," in line:
                        # Strip class year markers
                        clean = re.sub(r"\s*[+*○]\s*$", "", line).strip()
                        # Determine class year from marker
                        class_year = None
                        if line.rstrip().endswith("+"):
                            class_year = "Rising Senior"
                        elif line.rstrip().endswith("*"):
                            class_year = "Rising Junior"
                        elif line.rstrip().endswith("○"):
                            class_year = "Rising Sophomore"

                        parts = clean.split(",", 1)
                        if len(parts) == 2:
                            company = parts[0].strip()
                            role = parts[1].strip()

                            # Handle count in parens: "Boston Consulting Group, Intern (3)"
                            count = 1
                            count_match = re.search(r"\((\d+)\)\s*$", role)
                            if count_match:
                                count = int(count_match.group(1))
                                role = re.sub(r"\s*\(\d+\)\s*$", "", role).strip()

                            if company and role and len(company) > 2:
                                listings.append({
                                    "company": normalize_company(company),
                                    "role": role,
                                    "major": current_major,
                                    "school": school,
                                    "class_year": class_year,
                                    "count": count,
                                    "year": 2019,
                                    "source": "penn_summer_outcomes",
                                })

    return listings


def run() -> dict:
    """Enrich projected Penn data with detailed Levels.fyi compensation + major listings."""
    print("=" * 60)
    print("Step 6: Enrichment (Penn × Levels.fyi + Major Listings)")
    print("=" * 60)

    projected = _load_json("projected_outcomes.json")
    levels_data = _load_json("levels_fyi.json")

    if not projected or not levels_data:
        print("  ERROR: Missing input data. Run previous steps first.")
        return {}

    # Build lookups
    print("\n  Building rich Levels.fyi lookup...")
    levels_lookup = _build_rich_levels_lookup(levels_data)
    industry_medians = _build_industry_medians(levels_data)
    print(f"    {len(levels_lookup)} unique companies")
    print(f"    Overall median: ${industry_medians['median_hourly']}/hr")

    # --- Build set of companies with actual intern data (from Summer Outcomes) ---
    summer_data = _load_json("penn_summer_outcomes.json")
    actual_intern_companies: dict[str, set] = {}
    for school in ["CAS", "SEAS", "Wharton", "Nursing"]:
        actual_intern_companies[school] = set()
        school_summer = summer_data.get("schools", {}).get(school, {})
        for yr_data in school_summer.values():
            if isinstance(yr_data, dict):
                for emp in yr_data.get("employers", []):
                    actual_intern_companies[school].add(emp.get("company", ""))

    # --- Enrich each school's employer data ---
    enriched = {}
    total_matched = 0
    total_unmatched = 0

    for school in ["CAS", "SEAS", "Wharton", "Nursing"]:
        print(f"\n  Enriching {school}...")
        school_records = []

        school_projected = projected.get("projected", {}).get(school, [])
        school_actual = projected.get("actual", {}).get(school, [])

        for year_data in school_actual + school_projected:
            employers = year_data.get("employers", [])
            year = year_data.get("year")
            is_projected = year_data.get("is_projected", False)

            for emp in employers:
                company = emp.get("company") if isinstance(emp, dict) else str(emp)
                count = emp.get("count", 0) if isinstance(emp, dict) else 0

                levels_match = _fuzzy_match(company, levels_lookup)

                # Determine data basis for this company
                has_intern_data = company in actual_intern_companies.get(school, set())
                if not is_projected:
                    data_basis = "actual"  # actual 2017-2019 record
                elif has_intern_data:
                    data_basis = "projected"  # has 2019 intern data, projected forward
                else:
                    data_basis = "inferred"  # only in First Dest, no intern baseline

                if levels_match:
                    total_matched += 1

                    # Use year-specific hourly rate from salary_trend if available
                    trend = levels_match.get("salary_trend", {})
                    year_hourly = None
                    if year and trend:
                        year_hourly = trend.get(str(year)) or trend.get(int(year))
                    hourly = float(year_hourly) if year_hourly else float(levels_match["hourly_median"])
                    monthly = round(hourly * 40 * 4.33, 0)

                    record = {
                        "company": company,
                        "school": school,
                        "industry": COMPANY_INDUSTRIES.get(company, "Other"),
                        "year": year,
                        "penn_intern_count": count,
                        "hourly_median": hourly,
                        "monthly_estimate": monthly,
                        "roles": levels_match["roles"],
                        "locations": levels_match["locations"],
                        "salary_trend": levels_match["salary_trend"],
                        "levels_fyi_entries": levels_match["entry_count"],
                        "compensation_source": "levels_fyi",
                        "is_projected": is_projected,
                        "data_basis": data_basis,
                        "source": "enriched",
                    }
                else:
                    total_unmatched += 1
                    record = {
                        "company": company,
                        "school": school,
                        "industry": COMPANY_INDUSTRIES.get(company, "Other"),
                        "year": year,
                        "penn_intern_count": count,
                        "hourly_median": industry_medians["median_hourly"],
                        "monthly_estimate": industry_medians["median_monthly"],
                        "roles": [],
                        "locations": [],
                        "salary_trend": {},
                        "levels_fyi_entries": 0,
                        "compensation_source": "industry_median",
                        "is_projected": is_projected,
                        "data_basis": data_basis,
                        "source": "enriched",
                    }

                school_records.append(record)

        # Deduplicate by company+year
        seen = {}
        for r in school_records:
            key = (r["company"], r["year"])
            if key not in seen or r["levels_fyi_entries"] > seen[key]["levels_fyi_entries"]:
                seen[key] = r
        school_records = list(seen.values())

        enriched[school] = school_records

        matched = [r for r in school_records if r["compensation_source"] == "levels_fyi"]
        if matched:
            median_hourly = statistics.median(float(r["hourly_median"]) for r in matched)
            print(f"    {len(matched)} companies matched, median ${median_hourly:.0f}/hr")

    # --- Per-major job listings ---
    print("\n  Extracting per-major job listings from 2019 PDFs...")
    summer_data = _load_json("penn_summer_outcomes.json")
    major_listings = _load_major_listings(summer_data)
    print(f"    {len(major_listings)} individual listings found")

    # Summarize by school
    by_school = defaultdict(int)
    by_major = defaultdict(int)
    for listing in major_listings:
        by_school[listing["school"]] += 1
        by_major[listing["major"]] += 1
    for school, count in sorted(by_school.items()):
        print(f"      {school}: {count} listings")
    print(f"    Top majors: {', '.join(f'{m} ({c})' for m, c in sorted(by_major.items(), key=lambda x: -x[1])[:5])}")

    # Summary
    print(f"\n  Overall: {total_matched} matched, {total_unmatched} unmatched")
    match_rate = total_matched / (total_matched + total_unmatched) * 100 if (total_matched + total_unmatched) > 0 else 0
    print(f"  Match rate: {match_rate:.0f}%")

    # Export
    output = {
        "enriched_employers": enriched,
        "major_listings": major_listings,
        "methodology": {
            "description": "Penn employers cross-referenced with Levels.fyi compensation (role-specific, multi-location, year trends). Per-major job listings extracted from 2019 Summer Outcomes PDFs.",
            "levels_fyi_companies": len(levels_lookup),
            "industry_median_hourly": industry_medians["median_hourly"],
            "match_rate_pct": round(match_rate, 1),
            "major_listings_count": len(major_listings),
        },
    }
    export_json(output, OUTPUT_DIR / "enriched_penn_internships.json")

    # --- Export Supabase-ready JSON (JSONB-friendly) ---
    print("\n  Exporting Supabase-ready JSON files...")
    _export_supabase_json(enriched, major_listings, projected, OUTPUT_DIR)

    return output


def _export_supabase_json(enriched: dict, major_listings: list, projected: dict, output_dir: Path):
    """Export flat JSON arrays ready for Supabase import with native JSONB columns."""
    import json as _json

    # --- supabase_employers.json ---
    # roles, locations, salary_trend as proper JSON arrays/objects
    employer_rows = []
    for school, records in enriched.items():
        for r in records:
            employer_rows.append({
                "company": r["company"],
                "school": r["school"],
                "industry": r.get("industry"),
                "year": r.get("year"),
                "penn_intern_count": r.get("penn_intern_count"),
                "hourly_median": float(r["hourly_median"]) if r.get("hourly_median") else None,
                "monthly_estimate": float(r["monthly_estimate"]) if r.get("monthly_estimate") else None,
                "roles": r.get("roles", []),  # JSONB array
                "locations": r.get("locations", []),  # JSONB array
                "salary_trend": r.get("salary_trend", {}),  # JSONB object
                "levels_fyi_entries": r.get("levels_fyi_entries", 0),
                "compensation_source": r.get("compensation_source"),
                "is_projected": r.get("is_projected", False),
                "data_basis": r.get("data_basis"),
            })

    with open(output_dir / "supabase_employers.json", "w") as f:
        _json.dump(employer_rows, f, indent=2)
    print(f"    supabase_employers.json: {len(employer_rows)} rows")

    # --- supabase_major_listings.json ---
    # Filter garbage same as CSV export
    GARBAGE_MAJORS = {
        'sophomores', 'juniors', 'seniors', 'independent', 'industries',
        'monthly', 'job/', 'traveled/', 'completed', 'work/', 'average',
        'part-time', 'full-time', 'volunteer', 'primary summer', 'unpaid',
        'the school of', 'the college of', 'rate overall', 'chicago',
        'new york', 'curriculum deferred',
    }
    skip_words = ['report', 'survey', 'response', 'salary', 'internship,',
                  'classes,', 'summer of', 'there were', '%', '$']

    clean_listings = []
    for ml in major_listings:
        company = ml.get("company", "")
        role = ml.get("role", "")
        major = ml.get("major", "")
        if any(g in major.lower() for g in GARBAGE_MAJORS):
            continue
        if any(w in company.lower() for w in skip_words):
            continue
        if any(w in role.lower() for w in skip_words):
            continue
        if len(company) < 3 or len(role) < 2 or (company and company[0].isdigit()):
            continue
        clean_listings.append({
            "company": company,
            "role": role,
            "major": major,
            "school": ml.get("school"),
            "class_year": ml.get("class_year"),
            "count": ml.get("count", 1),
            "year": ml.get("year", 2019),
        })

    with open(output_dir / "supabase_major_listings.json", "w") as f:
        _json.dump(clean_listings, f, indent=2)
    print(f"    supabase_major_listings.json: {len(clean_listings)} rows")

    # --- supabase_industry_breakdown.json ---
    industry_rows = []
    for source_key in ["actual", "projected"]:
        for school, year_list in projected.get(source_key, {}).items():
            for year_data in year_list:
                year = year_data.get("year")
                is_projected = year_data.get("is_projected", False)
                salary = year_data.get("salary_monthly")
                for ind in year_data.get("industries", []):
                    industry_rows.append({
                        "school": school,
                        "year": year,
                        "industry": ind.get("industry"),
                        "percentage": float(ind["percentage"]) if ind.get("percentage") else None,
                        "confidence": ind.get("confidence"),
                        "salary_monthly": float(salary) if salary else None,
                        "is_projected": is_projected,
                    })

    with open(output_dir / "supabase_industry_breakdown.json", "w") as f:
        _json.dump(industry_rows, f, indent=2)
    print(f"    supabase_industry_breakdown.json: {len(industry_rows)} rows")


if __name__ == "__main__":
    run()
