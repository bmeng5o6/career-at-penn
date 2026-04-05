# Internship Data Scraping — Summary for PM

**Owner:** Michael & Evan
**Branch:** `users/mlicamele/data-plan`
**Target:** March 29th (data ready) → April 1st (MVP)

---

## What We Built

A Python pipeline (`python main.py`, ~73s) that produces the final dataset for the "Anonymized Vibe Checks" and "Statistics" pages. Run it once to generate all data.

### What the data covers

**Per company (for company cards):**
- Company name, Penn intern count, which Penn schools
- Role-specific compensation from Levels.fyi (e.g., Google SWE $43/hr, PM $48/hr, Research $63/hr)
- Multiple intern locations
- Year-over-year salary trends (2018-2026)

**Per major (for Alumni Path Intelligence):**
- 2,476 individual internship listings from 2019: major → company + role + class year
- e.g., "Computer Science → Amazon, Software Dev Intern (Rising Junior)"

**Per school (for Statistics):**
- Industry breakdown with 17-18 industries per school
- Projected 2026 intern salaries (SEAS: $7,371/mo, Wharton: $5,788/mo, CAS: $4,117/mo)
- Top employers with hire counts

## Data Sources

| Source | What it gives us | Years |
|--------|-----------------|-------|
| Penn Summer Outcomes PDFs | Baseline internship data: employers, industries, salaries, per-major listings | 2017-2019 |
| Penn First Destination PDFs | Post-grad trends: industry shifts, salary growth, employer lists per school | 2017-2024 |
| Levels.fyi (public JSON endpoint) | Current intern compensation: 13,447 entries from 3,007 companies | 2019-2026 |

## What We Extrapolate

Penn's internship survey (Summer Outcomes) stopped in 2019. To produce 2020-2026 estimates:

1. **Industry distributions:** We use the 2024 First Destination industry data per school as a baseline, then apply "offset corrections" (e.g., Consulting is ~7pp higher in post-grad data than internship data — we subtract that). This gives us a realistic internship industry breakdown for each school.

2. **Salary:** We take the 2019 intern monthly salary and apply the First Destination annual salary growth rate. SEAS post-grad salaries grew ~37% from 2020→2024, so we project intern salaries grew at the same rate.

3. **Employer lists:** Projected years reuse the latest First Destination employer list (2024) since we don't have actual intern employer data after 2019.

**Validation:** Backtested on 2017-2019 data — ~3.2pp mean error per industry. COVID years (2020-2021) excluded from trend fitting. All projected data tagged with `is_projected: true`.

## Pipeline Output

All files in `scraping/output/`:

| File | Contents |
|------|----------|
| `penn_summer_outcomes.json` | 2017-2019 actual internship data per school |
| `penn_first_destination.json` | 2017-2024 post-grad trends per school |
| `backtest_results.json` | Extrapolation validation (3.2pp MAE) |
| `projected_outcomes.json` | 2020-2026 projected internship data per school |
| `levels_fyi.json` | 13,447 intern compensation entries |
| `enriched_penn_internships.json` | **Final dataset** — Penn employers + rich Levels.fyi data + per-major listings |

## Key Stats

- **84% match rate** — 252 Penn employers matched with Levels.fyi compensation
- **Wharton: 100%** match (18/18), SEAS: 93% (13/14), CAS: 71% (22/31)
- **2,476 per-major listings** — SEAS: 478, Wharton: 716, CAS: 1,282
- **13,447 Levels.fyi entries** with role-specific pay, locations, and year trends

## How to Run

```bash
cd scraping/
source .venv/bin/activate
python main.py          # runs all 6 steps, ~73s
```

Individual steps:
```bash
python -m scrapers.penn_summer_outcomes     # Step 1
python -m scrapers.penn_first_destination   # Step 2
python -m analysis.backtest                 # Step 3
python -m analysis.extrapolate             # Step 4
python -m scrapers.levels_fyi              # Step 5
python -m analysis.enrich                  # Step 6
```
