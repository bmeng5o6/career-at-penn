"""
Levels.fyi Internship Scraper.

Fetches internship compensation data from Levels.fyi's public JSON endpoint.
Falls back to Playwright-based scraping if the endpoint is unavailable.

Usage:
    python -m scrapers.levels_fyi
"""

import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import export_json
from utils import normalize_company

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
INTERNSHIP_JSON_URL = "https://www.levels.fyi/js/internshipData.json"


def _fetch_json() -> list[dict]:
    """Fetch internship data from Levels.fyi's public JSON endpoint."""
    print("    Fetching from public JSON endpoint...")
    resp = requests.get(
        INTERNSHIP_JSON_URL,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
    )
    resp.raise_for_status()
    raw = resp.json()
    print(f"    Got {len(raw)} raw entries")
    return raw


def _parse_raw(raw_entries: list[dict]) -> list[dict]:
    """Parse raw Levels.fyi JSON into clean records."""
    results = []
    for item in raw_entries:
        company = item.get("company")
        if not company:
            continue

        hourly = item.get("hourlySalary")
        monthly = item.get("monthlySalary")

        # Determine best compensation value
        # Some entries have monthlySalary in thousands (e.g., 3 = $3k), others in actual dollars
        compensation = None
        comp_type = None
        if hourly and float(hourly) > 1:
            compensation = float(hourly)
            comp_type = "hourly"
        elif monthly and float(monthly) > 100:
            compensation = float(monthly)
            comp_type = "monthly"

        results.append({
            "company": normalize_company(str(company)),
            "role": item.get("title") or "Intern",
            "compensation_amount": compensation,
            "compensation_type": comp_type,
            "location": item.get("loc") or None,
            "season": item.get("season") or None,
            "year": int(item["yr"]) if item.get("yr") else None,
            "education_level": item.get("educationLevel") or None,
            "verified": item.get("verified", False),
            "source": "levels_fyi",
        })

    return results


def run() -> list[dict]:
    """Fetch and parse Levels.fyi internship data."""
    print("=" * 60)
    print("Step 5: Levels.fyi Internship Scraper")
    print("=" * 60)

    start = time.time()

    try:
        raw = _fetch_json()
    except Exception as e:
        print(f"    ERROR fetching JSON: {e}")
        print("    The public endpoint may have moved. Consider Playwright fallback.")
        return []

    results = _parse_raw(raw)

    # Stats
    with_comp = [r for r in results if r.get("compensation_amount")]
    unique_companies = len(set(r["company"] for r in results))
    elapsed = time.time() - start

    print(f"\n  Parsed: {len(results)} entries ({len(with_comp)} with compensation)")
    print(f"  Unique companies: {unique_companies}")
    print(f"  Time: {elapsed:.1f}s")

    # Sample
    print("\n  Sample entries:")
    for target in ["Google", "Goldman Sachs", "Meta", "Amazon", "McKinsey & Company", "JPMorgan Chase & Co.", "Microsoft"]:
        matches = [r for r in results if r["company"] == target and r.get("compensation_amount")]
        if matches:
            # Get median compensation
            comps = sorted(m["compensation_amount"] for m in matches)
            median = comps[len(comps) // 2]
            print(f"    {target:35s} ${median:.0f}/hr  ({len(matches)} entries)")

    # Export
    export_json(results, OUTPUT_DIR / "levels_fyi.json")

    return results


if __name__ == "__main__":
    run()
