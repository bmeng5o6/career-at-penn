# Career at Penn — Data Pipeline

Python pipeline that produces Penn-specific internship data by combining Penn Career Services PDFs with Levels.fyi compensation data.

## Quick Start

```bash
cd scraping/
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py    # runs all 6 steps, ~73s
```

## What It Produces

**`output/enriched_penn_internships.json`** — the final dataset with:

**Per-company data (for company cards):**
- Company name, which Penn schools recruit there, Penn intern count
- Role-specific compensation (SWE $43/hr, PM $48/hr, etc.)
- Intern locations (NYC, SF, etc.)
- Year-over-year salary trends (2018-2026)
- Data point count from Levels.fyi

**Per-major job listings (for Alumni Path Intelligence):**
- 2,476 individual internship placements from 2019
- Major → Company + Role + Class Year
- e.g., "Computer Science → Amazon, Software Dev Intern (Rising Junior)"

## Pipeline Steps

| Step | Script | What it does |
|------|--------|-------------|
| 1 | `scrapers/penn_summer_outcomes.py` | Scrapes 17 Penn Summer Outcomes PDFs (2017-2019) for internship employers, industries, salaries, and per-major listings |
| 2 | `scrapers/penn_first_destination.py` | Scrapes 29 Penn First Destination PDFs (2017-2024) for post-grad employment trends |
| 3 | `analysis/backtest.py` | Validates that post-grad trends can predict internship trends (~3.2pp error) |
| 4 | `analysis/extrapolate.py` | Projects 2020-2026 internship industry distributions and salaries using post-grad trends with offset corrections |
| 5 | `scrapers/levels_fyi.py` | Fetches 13,447 intern compensation entries from Levels.fyi |
| 6 | `analysis/enrich.py` | Cross-references Penn employers with Levels.fyi (role-specific pay, locations, trends) + extracts per-major listings |

Run individually: `python -m scrapers.penn_summer_outcomes`, etc.

## Extrapolation Methodology

Penn's internship survey stopped in 2019. We project forward by:
1. Using 2024 First Destination industry data per school as baseline, with offset corrections (e.g., Consulting -7pp, Education +6pp)
2. Growing 2019 intern salary by First Destination salary growth rate
3. Reusing latest First Destination employer list for projected years
4. COVID years (2020-2021) excluded from trend fitting

Backtest: ~3.2pp mean error when predicting known 2019 data from 2017 baseline.

## Output Files

| File | Contents |
|------|----------|
| `enriched_penn_internships.json` | **Final dataset** — ready for Supabase |
| `penn_summer_outcomes.json` | Raw 2017-2019 internship data |
| `penn_first_destination.json` | Raw 2017-2024 post-grad data |
| `projected_outcomes.json` | Projected 2020-2026 data |
| `levels_fyi.json` | Raw Levels.fyi data (13,447 entries) |
| `backtest_results.json` | Validation results |

## Project Structure

```
scraping/
  main.py              # Orchestrator — python main.py
  config.py            # PDF URLs, company/industry aliases, offset corrections
  schema.py            # Pydantic data models
  utils.py             # Normalization, fuzzy matching, PDF text helpers
  db.py                # JSON/CSV export, Supabase client
  scrapers/            # Data collection (each has run() + __main__)
  analysis/            # Processing (each has run() + __main__)
  output/              # Generated data (gitignored)
```

## Supabase

Copy `.env.example` to `.env` and set `SUPABASE_URL` + `SUPABASE_KEY`. The pipeline currently exports JSON; `db.batch_insert()` is ready for when the database is set up.

## Caveats

- Projected data is tagged `is_projected: true` — display disclaimers in the app
- Levels.fyi skews toward tech/finance — Nursing/CAS non-tech estimates use industry median as fallback
- Per-major listings are from 2019 only (latest available)
- 84% of Penn employers matched with Levels.fyi; unmatched companies get industry median compensation
