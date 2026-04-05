# Scraping Pipeline — Agent Rules

- This is Python code. Do NOT apply Next.js conventions here.
- Always test changes by running `python main.py` from the `scraping/` directory with venv activated.
- PDF parsing is fragile — always inspect raw pdfplumber text output before writing regex patterns.
- The `_KNOWN_INDUSTRIES` set in `utils.py` is the source of truth for industry matching. Add new industries there.
- Company aliases in `config.py` should be updated when new company name variants are discovered.
- The Levels.fyi data comes from a public JSON endpoint — no Playwright/browser needed.
- Enriched output includes role-specific pay, locations, and salary trends per company — do not flatten to a single median.
- Per-major job listings are parsed from school-specific 2019 Summer Outcomes PDFs (pages 7+).
