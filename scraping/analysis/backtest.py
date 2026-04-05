"""
Backtest: validates that First Destination trends can predict Summer Outcomes.

Compares 2017→2019 First Destination industry trends against actual 2019 Summer Outcomes.
Outputs offset corrections and mean absolute error per industry.

Usage:
    python -m analysis.backtest
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import export_json

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"

# Hardcoded data from PDF extraction (validated manually)
# These are overall undergraduate percentages for Rising Seniors.

SUMMER_2017 = {
    "Financial Services": 27, "Technology": 12, "Education": 12,
    "Consulting": 10, "Healthcare": 7, "Nonprofit": 6,
    "Government": 3, "Other": 14,
}

SUMMER_2019 = {
    "Financial Services": 24, "Technology": 15, "Education": 13,
    "Consulting": 11, "Healthcare": 9, "Nonprofit": 6,
    "Government": 3, "Other": 19,
}

FIRST_DEST_2017 = {
    "Financial Services": 25.7, "Technology": 13.8, "Education": 6.6,
    "Consulting": 16.0, "Healthcare": 12.5, "Nonprofit": 3.5,
    "Government": 2.0, "Other": 19.9,
}

FIRST_DEST_2019 = {
    "Financial Services": 30.0, "Technology": 16.0, "Education": 5.0,
    "Consulting": 18.0, "Healthcare": 9.0, "Nonprofit": 3.0,
    "Government": 2.0, "Other": 17.0,
}

# Salary data
SALARY_DATA = {
    "summer_monthly": {2017: 3439, 2018: 3603, 2019: 4606},
    "first_dest_annual": {2017: 67893, 2018: 75000, 2019: 77500},
}


def run() -> dict:
    """Run backtest analysis. Returns results dict."""
    print("=" * 60)
    print("Step 3: Backtest Analysis")
    print("=" * 60)

    results = {
        "industry_offsets": {},
        "backtest_errors": {},
        "mean_absolute_error": 0,
        "salary_growth": {},
    }

    # --- Calculate structural offsets (Summer vs First Dest in same year) ---
    print("\n  Structural offsets (First Dest - Summer, 2019):")
    all_industries = set(SUMMER_2019.keys()) | set(FIRST_DEST_2019.keys())
    for industry in sorted(all_industries):
        summer_val = SUMMER_2019.get(industry, 0)
        fd_val = FIRST_DEST_2019.get(industry, 0)
        offset = fd_val - summer_val
        results["industry_offsets"][industry] = offset
        print(f"    {industry:40s} offset = {offset:+.1f}pp")

    # --- Backtest: use 2017 FD→2019 FD trend to predict 2019 Summer from 2017 Summer ---
    print("\n  Backtest: predict 2019 Summer from 2017 Summer + FD trends")
    total_error = 0
    n_industries = 0

    for industry in sorted(all_industries):
        summer_2017 = SUMMER_2017.get(industry, 0)
        fd_2017 = FIRST_DEST_2017.get(industry, 0)
        fd_2019 = FIRST_DEST_2019.get(industry, 0)
        actual_2019 = SUMMER_2019.get(industry, 0)

        # Predicted = 2017 Summer + (FD 2019 - FD 2017)
        fd_delta = fd_2019 - fd_2017
        predicted_2019 = summer_2017 + fd_delta
        error = abs(predicted_2019 - actual_2019)

        results["backtest_errors"][industry] = {
            "predicted": round(predicted_2019, 1),
            "actual": actual_2019,
            "error_pp": round(error, 1),
        }
        total_error += error
        n_industries += 1

        print(f"    {industry:40s} pred={predicted_2019:5.1f}%  actual={actual_2019:5.1f}%  err={error:4.1f}pp")

    mae = total_error / n_industries if n_industries > 0 else 0
    results["mean_absolute_error"] = round(mae, 2)
    print(f"\n  Mean Absolute Error: {mae:.2f} percentage points")

    # --- Salary growth rates ---
    print("\n  Salary growth rates:")
    summer_growth = (SALARY_DATA["summer_monthly"][2019] / SALARY_DATA["summer_monthly"][2017] - 1) * 100
    fd_growth = (SALARY_DATA["first_dest_annual"][2019] / SALARY_DATA["first_dest_annual"][2017] - 1) * 100
    results["salary_growth"] = {
        "summer_monthly_2017_2019_pct": round(summer_growth, 1),
        "first_dest_annual_2017_2019_pct": round(fd_growth, 1),
    }
    print(f"    Summer intern salary: +{summer_growth:.1f}% (2017→2019)")
    print(f"    First Dest salary:    +{fd_growth:.1f}% (2017→2019)")

    # --- Export ---
    export_json(results, OUTPUT_DIR / "backtest_results.json")
    return results


if __name__ == "__main__":
    run()
