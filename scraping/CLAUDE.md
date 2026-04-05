# Scraping Pipeline — Agent Instructions

This is a Python data pipeline in `scraping/`, separate from the Next.js frontend.

## How to run
```bash
cd scraping/ && source .venv/bin/activate && python main.py
```

## Key Rules
- Always activate the venv first
- Run from the `scraping/` directory
- PDF parsing uses pdfplumber TEXT extraction + regex — table extraction does NOT work on these PDFs
- `PennSchool` is a `(str, Enum)` — use `isinstance(x, PennSchool)` not `isinstance(x, str)`
- JSON values loaded from file may be strings — always cast with `float()` / `int()` when doing math
- Each script in `scrapers/` and `analysis/` exposes a `run()` function AND `if __name__ == "__main__"`
- `main.py` chains all `run()` calls in order

## Architecture
- `config.py` — PDF URLs, company/industry aliases, structural offset corrections
- `utils.py` — PDF text extraction helpers with known-industry matching and garbage filters
- `schema.py` — Pydantic models (source of truth for data shape)
- `db.py` — JSON/CSV export + Supabase insertion
- `analysis/enrich.py` — the final step that produces `enriched_penn_internships.json`

## What the pipeline extrapolates
- **Industry distributions:** 2024 First Destination data per school → offset-corrected to approximate internship distributions
- **Salary:** 2019 intern salary × First Destination salary growth rate → projected 2026 salary
- **Employer lists:** Projected years reuse 2024 First Destination employer list
- All projected records have `is_projected: true`

## Levels.fyi data
- Fetched from a public JSON endpoint (`/js/internshipData.json`) — no scraping needed
- 13,447 entries, 3,007 companies, role-specific pay, locations, year trends
- Matched to Penn employers via fuzzy matching (rapidfuzz, threshold 70) + alias dict in config.py
