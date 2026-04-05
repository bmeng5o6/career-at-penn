"""
Penn Career Services Summer Outcomes PDF Scraper (2017-2019).

Extracts per school: top employers with counts, industry %, monthly salaries.

Usage:
    python -m scrapers.penn_summer_outcomes
"""

import re
import sys
from pathlib import Path

import pdfplumber
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import SUMMER_OUTCOMES_URLS
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
    results = []
    for name, count in raw:
        results.append({"company": normalize_company(name), "count": count})
    return results


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


def _parse_salary(text: str) -> float | None:
    """Find monthly salary in text. Returns first match between $500-$20000."""
    for pat in [
        re.compile(r"Salary\s+\$([\d,]+)"),
        re.compile(r"\$([\d,]+)\s+\$([\d,]+)"),
        re.compile(r"\$([\d,]+)"),
    ]:
        for match in pat.finditer(text):
            val = float(match.group(1).replace(",", ""))
            if 500 < val < 20000:
                return val
    return None


def _parse_pdf(pdf_path: Path, year: int, school: str | None = None) -> dict:
    """Parse a single Summer Outcomes PDF into structured data."""
    full_text = _get_text(pdf_path)
    page_texts = _get_page_texts(pdf_path)

    result = {
        "year": year,
        "school": school,
        "source": DataSource.PENN_SUMMER_OUTCOMES.value,
        "employers": [],
        "industries": [],
        "salary_monthly": None,
        "class_years": {},
    }

    # --- Employers: search from "Popular Employers" to next page boundary ---
    for marker in ["Popular Employers", "Top Employers"]:
        idx = full_text.find(marker)
        if idx >= 0:
            # Stop at city-related text to avoid capturing location data
            chunk = full_text[idx:idx + 1500]
            for stopper in ["United States", "Popular Cities", "International", "Job & Internship Locations"]:
                stop_idx = chunk.find(stopper)
                if stop_idx > 0:
                    chunk = chunk[:stop_idx]
            result["employers"] = _parse_employers(chunk)
            break

    # If no marker found, try the whole second page
    if not result["employers"] and len(page_texts) > 1:
        result["employers"] = _parse_employers(page_texts[1])

    # --- Industries: look for "Industries" section ---
    idx = full_text.find("Industries")
    if idx >= 0:
        chunk = full_text[idx:idx + 1000]
        result["industries"] = _parse_industries(chunk)

    # Fallback: scan all pages for industry data
    if not result["industries"]:
        for pt in page_texts:
            industries = _parse_industries(pt)
            if len(industries) > 3:  # found a real industry section
                result["industries"] = industries
                break

    # --- Salary ---
    result["salary_monthly"] = _parse_salary(full_text)

    # --- Class-year breakdowns (Rising Seniors / Juniors / Sophomores) ---
    for label in ["Rising Seniors", "Rising Juniors", "Rising Sophomores"]:
        for pt in page_texts:
            if label in pt:
                # Industries are in the same page text
                idx = pt.find("Industries")
                cy_industries = _parse_industries(pt[idx:] if idx >= 0 else pt)

                # Salary: look for "Salary $X,XXX" pattern
                cy_salary = _parse_salary(pt)

                result["class_years"][label] = {
                    "industries": cy_industries,
                    "salary_monthly": cy_salary,
                }
                break

    return result


def run() -> dict:
    """Download and parse all Summer Outcomes PDFs. Returns structured data."""
    print("=" * 60)
    print("Step 1: Penn Summer Outcomes Scraper (2017-2019)")
    print("=" * 60)

    all_data = {"summaries": {}, "schools": {}}

    # --- Summary PDFs ---
    print("\n  Downloading & parsing summary PDFs...")
    for year, url in SUMMER_OUTCOMES_URLS.get("summary", {}).items():
        path = _download(url, f"summer_summary_{year}.pdf")
        data = _parse_pdf(path, year)
        all_data["summaries"][year] = data
        print(f"    {year}: {len(data['employers'])} employers, {len(data['industries'])} industries, salary={data['salary_monthly']}")

    # --- School-specific PDFs ---
    print("\n  Downloading & parsing school-specific PDFs...")
    for school in PennSchool:
        school_urls = SUMMER_OUTCOMES_URLS.get(school, {})
        if not school_urls:
            continue
        all_data["schools"][school.value] = {}
        for year, url in school_urls.items():
            path = _download(url, f"summer_{school.value}_{year}.pdf")
            data = _parse_pdf(path, year, school=school.value)
            all_data["schools"][school.value][year] = data
            print(f"    {school.value} {year}: {len(data['employers'])} employers, {len(data['industries'])} industries")

    # --- Industry PDFs (supplementary) ---
    print("\n  Downloading industry PDFs...")
    for year, url in SUMMER_OUTCOMES_URLS.get("industry", {}).items():
        _download(url, f"summer_industry_{year}.pdf")
        print(f"    {year}: downloaded")

    # --- Export ---
    output_path = OUTPUT_DIR / "penn_summer_outcomes.json"
    export_json(all_data, output_path)

    # Print summary
    total_employers = sum(len(d["employers"]) for d in all_data["summaries"].values())
    total_school_employers = sum(
        len(d["employers"])
        for school_data in all_data["schools"].values()
        for d in school_data.values()
    )
    print(f"\n  Total: {total_employers} summary employer entries, {total_school_employers} school-specific entries")

    return all_data


if __name__ == "__main__":
    run()
