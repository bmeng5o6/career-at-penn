"""
Career at Penn — Data Pipeline Orchestrator

Runs all scraping and analysis steps in sequence:
  1. Penn Summer Outcomes scraper (2017-2019 internship data)
  2. Penn First Destination scraper (2019-2024 post-grad trends)
  3. Backtest analysis (validates extrapolation approach)
  4. Extrapolation (projects 2020-2026 internship data)
  5. Levels.fyi internship compensation data
  6. Enrichment (Penn × Levels.fyi cross-reference)

Usage:
    cd scraping/
    source .venv/bin/activate
    python main.py
"""

import sys
import time
from pathlib import Path

# Ensure imports work
sys.path.insert(0, str(Path(__file__).resolve().parent))


def main():
    start = time.time()

    print("\n" + "=" * 60)
    print("  Career at Penn — Data Pipeline")
    print("=" * 60)

    # Step 1: Penn Summer Outcomes
    from scrapers.penn_summer_outcomes import run as run_summer
    summer_data = run_summer()

    # Step 2: Penn First Destination
    from scrapers.penn_first_destination import run as run_first_dest
    fd_data = run_first_dest()

    # Step 3: Backtest
    from analysis.backtest import run as run_backtest
    backtest_results = run_backtest()

    # Step 4: Extrapolation
    from analysis.extrapolate import run as run_extrapolate
    projected = run_extrapolate()

    # Step 5: Levels.fyi
    from scrapers.levels_fyi import run as run_levels
    levels_data = run_levels()

    # Step 6: Enrichment
    from analysis.enrich import run as run_enrich
    enriched = run_enrich()

    # Summary
    elapsed = time.time() - start
    print("\n" + "=" * 60)
    print("  Pipeline Complete")
    print("=" * 60)
    print(f"\n  Time: {elapsed:.1f}s")
    print(f"\n  Outputs in scraping/output/:")
    print(f"    penn_summer_outcomes.json       — 2017-2019 internship data")
    print(f"    penn_first_destination.json     — 2019-2024 post-grad trends")
    print(f"    backtest_results.json           — extrapolation validation")
    print(f"    projected_outcomes.json         — 2020-2026 projected data")
    print(f"    levels_fyi.json                — {len(levels_data)} intern compensation entries")
    print(f"    enriched_penn_internships.json  — final enriched dataset")
    print(f"\n  Backtest MAE: {backtest_results.get('mean_absolute_error', 'N/A')}pp")

    if projected:
        for school in ["CAS", "SEAS", "Wharton", "Nursing"]:
            school_proj = projected.get("projected", {}).get(school, [])
            proj_2026 = next((p for p in school_proj if p["year"] == 2026), None)
            if proj_2026 and proj_2026.get("salary_monthly"):
                print(f"    {school} 2026 projected intern salary: ${proj_2026['salary_monthly']:.0f}/mo")

    if enriched:
        match_rate = enriched.get("methodology", {}).get("match_rate_pct", 0)
        print(f"\n  Levels.fyi match rate: {match_rate}%")

    print()


if __name__ == "__main__":
    main()
