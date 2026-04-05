"""
Upload scraped data to Supabase.

Reads the 3 Supabase-ready JSON files from output/ and batch-inserts
into the employers, major_listings, and industry_breakdown tables.

Prerequisites:
  1. Create scraping/.env with:
       SUPABASE_URL=https://xxxxx.supabase.co
       SUPABASE_KEY=eyJhbG...  (service_role key)
  2. Create the 3 tables in Supabase (see SQL below)
  3. Run `python main.py` to generate the JSON files

Usage:
    cd scraping/
    source .venv/bin/activate
    python upload_to_supabase.py

Supabase table creation SQL:

  CREATE TABLE employers (
    id BIGSERIAL PRIMARY KEY,
    company TEXT NOT NULL,
    school TEXT NOT NULL,
    year INTEGER,
    penn_intern_count INTEGER,
    hourly_median REAL,
    monthly_estimate REAL,
    roles JSONB DEFAULT '[]',
    locations JSONB DEFAULT '[]',
    salary_trend JSONB DEFAULT '{}',
    levels_fyi_entries INTEGER DEFAULT 0,
    compensation_source TEXT,
    is_projected BOOLEAN DEFAULT FALSE,
    data_basis TEXT
  );

  CREATE TABLE major_listings (
    id BIGSERIAL PRIMARY KEY,
    company TEXT NOT NULL,
    role TEXT,
    major TEXT,
    school TEXT,
    class_year TEXT,
    count INTEGER DEFAULT 1,
    year INTEGER DEFAULT 2019
  );

  CREATE TABLE industry_breakdown (
    id BIGSERIAL PRIMARY KEY,
    school TEXT NOT NULL,
    year INTEGER NOT NULL,
    industry TEXT,
    percentage REAL,
    confidence TEXT,
    salary_monthly REAL,
    is_projected BOOLEAN DEFAULT FALSE
  );
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

OUTPUT_DIR = Path(__file__).resolve().parent / "output"

TABLES = {
    "employers": "supabase_employers.json",
    "major_listings": "supabase_major_listings.json",
    "industry_breakdown": "supabase_industry_breakdown.json",
}


def upload():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key or url.startswith("https://your-"):
        print("ERROR: Set SUPABASE_URL and SUPABASE_KEY in scraping/.env")
        print()
        print("  1. Go to Supabase Dashboard → Project Settings → API")
        print("  2. Copy the Project URL and service_role key")
        print("  3. Create scraping/.env with:")
        print("       SUPABASE_URL=https://xxxxx.supabase.co")
        print("       SUPABASE_KEY=eyJhbG...")
        sys.exit(1)

    from supabase import create_client
    supabase = create_client(url, key)

    print("Connected to Supabase")
    print()

    for table, filename in TABLES.items():
        filepath = OUTPUT_DIR / filename
        if not filepath.exists():
            print(f"  SKIP {table}: {filename} not found. Run `python main.py` first.")
            continue

        with open(filepath) as f:
            rows = json.load(f)

        print(f"  Uploading {table}: {len(rows)} rows...")

        # Batch insert (Supabase has a ~1000 row limit per request)
        batch_size = 500
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            result = supabase.table(table).insert(batch).execute()
            print(f"    Batch {i // batch_size + 1}: {len(batch)} rows inserted")

        print(f"  Done: {table}")
        print()

    print("All uploads complete.")


if __name__ == "__main__":
    upload()
