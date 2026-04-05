"""
Penn Career Services First Destination PDF Scraper (2017-2024).

Extracts post-graduation employment trends used for extrapolating internship data.
Per school per year: top employers, industry %, salary stats, job functions (2022+).

Usage:
    python -m scrapers.penn_first_destination
"""

import re
import sys
from pathlib import Path

import pdfplumber
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import FIRST_DEST_INDUSTRY_URLS, FIRST_DEST_SCHOOL_URLS
from db import export_json
from schema import CompensationType, DataSource, PennSchool
from utils import extract_employer_counts, extract_industry_percentages, normalize_company, normalize_industry

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
PDF_DIR = OUTPUT_DIR / "pdfs"


def _download(url: str, filename: str) -> Path:
    path = PDF_DIR / filename
    if path.exists():
        return path
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    print(f"    Downloading {filename}...")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    path.write_bytes(resp.content)
    return path


def _get_text(pdf_path: Path) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        return "\n\n".join(p.extract_text() or "" for p in pdf.pages)


def _get_page_texts(pdf_path: Path) -> list[str]:
    with pdfplumber.open(pdf_path) as pdf:
        return [p.extract_text() or "" for p in pdf.pages]


def _parse_employers(text: str) -> list[dict]:
    raw = extract_employer_counts(text)
    return [{"company": normalize_company(n), "count": c} for n, c in raw]


def _parse_industries(text: str) -> list[dict]:
    raw = extract_industry_percentages(text)
    results = []
    seen = set()
    for name, pct in raw:
        norm = normalize_industry(name)
        if norm not in seen:
            results.append({"industry": norm, "percentage": pct})
            seen.add(norm)
    return results


def _parse_salary_stats(text: str) -> dict | None:
    """Extract salary statistics from First Destination PDFs.

    Looks for patterns like:
    - "Average Starting Salary $138,360"
    - "Respondents Average Median Range" table rows
    - "$100,653 $100,321" (5-year trend values)
    - "Median Salary: $77,500"
    """
    stats = {}

    # Average
    m = re.search(r"Average(?:\s+Starting)?\s+Salary\s+\$([\d,]+)", text)
    if m:
        stats["average"] = float(m.group(1).replace(",", ""))

    # Median
    m = re.search(r"Median(?:\s+(?:Starting|Salary))?\s+\$?([\d,]+)", text)
    if not m:
        m = re.search(r"\$?([\d,]+)\s+median", text, re.IGNORECASE)
    if m:
        stats["median"] = float(m.group(1).replace(",", ""))

    # Range — look for "$low $high" or "Range $low $high"
    m = re.search(r"Range\s+\$([\d,]+)\s+\$([\d,]+)", text)
    if m:
        stats["range_low"] = float(m.group(1).replace(",", ""))
        stats["range_high"] = float(m.group(2).replace(",", ""))

    # Respondent count
    m = re.search(r"(\d+)\s+\$([\d,]+)\s+\$([\d,]+)\s+\$([\d,]+)\s+\$([\d,]+)", text)
    if m:
        stats["respondent_count"] = int(m.group(1))
        if "average" not in stats:
            stats["average"] = float(m.group(2).replace(",", ""))
        if "median" not in stats:
            stats["median"] = float(m.group(3).replace(",", ""))
        if "range_low" not in stats:
            stats["range_low"] = float(m.group(4).replace(",", ""))
        if "range_high" not in stats:
            stats["range_high"] = float(m.group(5).replace(",", ""))

    # 5-year salary trend — look for consecutive dollar values
    trend_vals = re.findall(r"\$([\d,]+(?:\.\d+)?)", text)
    salary_trend = []
    for v in trend_vals:
        val = float(v.replace(",", ""))
        if 30000 < val < 500000:  # reasonable annual salary range
            salary_trend.append(val)
    if len(salary_trend) >= 3:
        stats["salary_trend"] = salary_trend[:5]  # at most 5 years

    if not stats:
        return None

    stats["compensation_type"] = CompensationType.ANNUAL.value
    return stats


def _parse_job_functions(text: str) -> list[dict]:
    """Extract job function breakdown like 'Software Development/Engineering 107 /46%'."""
    results = []
    # Pattern: "FunctionName count /XX%"
    p = re.compile(r"([A-Z][A-Za-z\s/&,()-]+?)\s+(\d+)\s*/(\d+(?:\.\d+)?)%")
    for match in p.finditer(text):
        name = match.group(1).strip()
        count = int(match.group(2))
        pct = float(match.group(3))
        if count > 0 and pct <= 100 and len(name) > 3:
            results.append({"function": name, "count": count, "percentage": pct})
    return results


def _parse_pdf(pdf_path: Path, year: int, school: str | None = None) -> dict:
    """Parse a single First Destination PDF."""
    full_text = _get_text(pdf_path)
    page_texts = _get_page_texts(pdf_path)

    result = {
        "year": year,
        "school": school,
        "source": DataSource.PENN_FIRST_DESTINATION.value,
        "employers": [],
        "industries": [],
        "salary": None,
        "job_functions": [],
    }

    # --- Employers ---
    for marker in ["Top Hiring Employers", "Top Employers", "Employers"]:
        idx = full_text.find(marker)
        if idx >= 0:
            chunk = full_text[idx:idx + 2000]
            # Stop at geography/location sections
            for stopper in ["Employment by State", "Employment by Geography", "United States", "Popular Cities"]:
                stop_idx = chunk.find(stopper)
                if stop_idx > 0:
                    chunk = chunk[:stop_idx]
            result["employers"] = _parse_employers(chunk)
            break

    if not result["employers"]:
        # Try page 3 which typically has employers in 2022+ format
        if len(page_texts) > 2:
            result["employers"] = _parse_employers(page_texts[2])

    # --- Industries ---
    for marker in ["Employment by Industry", "Industries", "Industry"]:
        idx = full_text.find(marker)
        if idx >= 0:
            chunk = full_text[idx:idx + 1500]
            result["industries"] = _parse_industries(chunk)
            break

    if not result["industries"]:
        # Scan all pages
        for pt in page_texts:
            industries = _parse_industries(pt)
            if len(industries) > 3:
                result["industries"] = industries
                break

    # --- Salary ---
    # Look for salary page (usually page 7 in 2022+ format)
    for pt in page_texts:
        if "Salary" in pt or "salary" in pt:
            stats = _parse_salary_stats(pt)
            if stats and ("average" in stats or "median" in stats):
                result["salary"] = stats
                break

    # Fallback: search full text
    if not result["salary"]:
        stats = _parse_salary_stats(full_text)
        if stats and ("average" in stats or "median" in stats):
            result["salary"] = stats

    # --- Job Functions (2022+ only) ---
    for pt in page_texts:
        if "Job Function" in pt or "job function" in pt.lower():
            result["job_functions"] = _parse_job_functions(pt)
            break

    return result


def run() -> dict:
    """Download and parse all First Destination PDFs. Returns structured data."""
    print("=" * 60)
    print("Step 2: Penn First Destination Scraper (2017-2024)")
    print("=" * 60)

    all_data = {"overall": {}, "schools": {}, "industry_reports": {}}

    # --- Overall reports (2017-2021) ---
    print("\n  Downloading & parsing overall reports...")
    overall_urls = FIRST_DEST_SCHOOL_URLS.get("overall", {})
    for year, url in overall_urls.items():
        try:
            path = _download(url, f"firstdest_overall_{year}.pdf")
            data = _parse_pdf(path, year)
            all_data["overall"][year] = data
            sal = data["salary"]
            sal_str = f"avg=${sal['average']}" if sal and "average" in sal else (f"med=${sal['median']}" if sal and "median" in sal else "no salary")
            print(f"    {year}: {len(data['employers'])} employers, {len(data['industries'])} industries, {sal_str}")
        except Exception as e:
            print(f"    {year}: ERROR - {e}")

    # --- School-specific reports (2020-2024) ---
    print("\n  Downloading & parsing school reports...")
    for school in PennSchool:
        school_urls = FIRST_DEST_SCHOOL_URLS.get(school, {})
        if not school_urls:
            continue
        all_data["schools"][school.value] = {}
        for year, url in school_urls.items():
            try:
                path = _download(url, f"firstdest_{school.value}_{year}.pdf")
                data = _parse_pdf(path, year, school=school.value)
                all_data["schools"][school.value][year] = data
                sal = data["salary"]
                sal_str = f"avg=${sal['average']}" if sal and "average" in sal else "no salary"
                print(f"    {school.value} {year}: {len(data['employers'])} emp, {len(data['industries'])} ind, {sal_str}, {len(data['job_functions'])} funcs")
            except Exception as e:
                print(f"    {school.value} {year}: ERROR - {e}")

    # --- Industry reports (2019-2022) ---
    print("\n  Downloading & parsing industry reports...")
    for year, url in FIRST_DEST_INDUSTRY_URLS.items():
        try:
            path = _download(url, f"firstdest_industry_{year}.pdf")
            data = _parse_pdf(path, year)
            all_data["industry_reports"][year] = data
            print(f"    {year}: {len(data['employers'])} employers, {len(data['industries'])} industries")
        except Exception as e:
            print(f"    {year}: ERROR - {e}")

    # --- Export ---
    output_path = OUTPUT_DIR / "penn_first_destination.json"
    export_json(all_data, output_path)

    # Summary
    total = sum(len(d["employers"]) for d in all_data["overall"].values())
    total += sum(
        len(d["employers"])
        for school_data in all_data["schools"].values()
        for d in school_data.values()
    )
    print(f"\n  Total: {total} employer entries across all reports")

    return all_data


if __name__ == "__main__":
    run()
