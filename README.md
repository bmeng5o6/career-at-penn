# Career at Penn

A web application for University of Pennsylvania students to explore internship and post-graduation career data, broken down by school and major.

## What it does

The site lets any Penn student enter their school, major, and class year, then browse three data views:

- **Internship Intelligence** — employer cards with Penn intern counts, hourly compensation estimates, role breakdowns from Levels.fyi, intern locations, and year-over-year pay trends. Filterable by school, year, industry, and data basis (actual / inferred / projected).
- **Statistics: Post-Grad Outcomes** — full-time employment, graduate school, and seeking rates across Wharton, SEAS, CAS, and Nursing from 2017 through 2024, displayed as a trend chart and a per-category bar chart.
- **Statistics: Major Insights** — 2,476 individual 2019 internship placements from Penn Summer Outcomes, searchable by major and company, showing top employers, top roles, and class-year distribution.

Guest access works without an account. Authenticated users have their profile saved to the database and skip the entry form on return visits.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, Recharts |
| Language | TypeScript |
| Database / Auth | Supabase |
| Data pipeline | Python 3, pdfplumber, rapidfuzz |

## Project structure

```
app/
  page.tsx                  # Entry form (home)
  internship/page.tsx       # Internship explorer
  statistics/page.tsx       # Post-grad outcomes and major insights
  profile/page.tsx          # Saved profile editor (auth required)
  signin/page.tsx
  register/page.tsx
  components/
    Navbar.tsx
    HeroSection.tsx
    EntryForm.tsx
    InternshipExplorer.tsx
  api/
    internships/            # Employer data, stats, industries, listings, schools
    majors/                 # Major list, company list, aggregated stats
    outcomes/               # Post-grad outcomes
    user/                   # Profile CRUD (GET / POST / PUT)
lib/supabase/
  client.ts                 # Browser client
  server.ts                 # Server-side client (cookie-based)
scraping/                   # Python data pipeline (see scraping/README.md)
```

## Local setup

**Prerequisites:** Node.js 20+, a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000`.

## Data pipeline

The `scraping/` directory contains the Python pipeline that produces the data loaded into Supabase. It pulls from Penn Career Services PDFs and Levels.fyi, projects forward from 2019 using First Destination trends, and outputs a single enriched JSON file ready for upload.

```bash
cd scraping/
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py        # runs all 6 steps, roughly 73 seconds
```

See `scraping/README.md` for the full pipeline breakdown, data sources, extrapolation methodology, and output file descriptions.

## Data sources and caveats

- Internship placements (major-level detail) come from Penn Summer Outcomes surveys, last published for 2019. There is no newer per-major data.
- Industry distributions and employer lists for 2020–2026 are projected using Penn First Destination trends and are tagged `is_projected: true` throughout the API and UI.
- Compensation data is from Levels.fyi (13,447 intern entries). 84% of Penn employers were matched; unmatched companies fall back to an industry median.
- Levels.fyi skews toward tech and finance. Non-tech estimates, especially for Nursing and CAS, are less reliable.

## Available scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # start production server
npm run lint     # ESLint
```
