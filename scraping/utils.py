"""Shared utilities: normalization, fuzzy matching, deduplication."""

import re
from typing import Optional

from rapidfuzz import fuzz, process

from config import COMPANY_ALIASES, INDUSTRY_ALIASES


# ============================================================
# Company name normalization
# ============================================================

# Suffixes to strip before matching
_COMPANY_SUFFIXES = re.compile(
    r",?\s*(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|& co\.?|co\.?|group|plc|lp|l\.p\.)$",
    re.IGNORECASE,
)


def normalize_company(name: str) -> str:
    """Normalize a company name using alias lookup + fuzzy matching."""
    cleaned = name.strip()
    if not cleaned:
        return cleaned

    # Check exact alias match (case-insensitive)
    lower = cleaned.lower()
    if lower in COMPANY_ALIASES:
        return COMPANY_ALIASES[lower]

    # Strip common suffixes and try again
    stripped = _COMPANY_SUFFIXES.sub("", cleaned).strip()
    lower_stripped = stripped.lower()
    if lower_stripped in COMPANY_ALIASES:
        return COMPANY_ALIASES[lower_stripped]

    # Fuzzy match against alias keys
    alias_keys = list(COMPANY_ALIASES.keys())
    match = process.extractOne(lower_stripped, alias_keys, scorer=fuzz.ratio, score_cutoff=85)
    if match:
        return COMPANY_ALIASES[match[0]]

    # No match — return cleaned original (title case)
    return cleaned


# ============================================================
# Industry normalization
# ============================================================

def normalize_industry(raw: str) -> str:
    """Map raw industry string to canonical name."""
    lower = raw.strip().lower()
    if lower in INDUSTRY_ALIASES:
        return INDUSTRY_ALIASES[lower]

    # Fuzzy match
    alias_keys = list(INDUSTRY_ALIASES.keys())
    match = process.extractOne(lower, alias_keys, scorer=fuzz.ratio, score_cutoff=75)
    if match:
        return INDUSTRY_ALIASES[match[0]]

    return "Other"


# ============================================================
# Compensation normalization
# ============================================================

_MONEY_PATTERN = re.compile(r"\$?([\d,]+(?:\.\d{1,2})?)")


def parse_salary(text: str) -> Optional[float]:
    """Extract a numeric salary value from text like '$3,406' or '77,500'."""
    match = _MONEY_PATTERN.search(text)
    if match:
        return float(match.group(1).replace(",", ""))
    return None


def monthly_to_annual(monthly: float) -> float:
    """Convert monthly salary to annual (assuming 12 months)."""
    return monthly * 12


def hourly_to_monthly(hourly: float, hours_per_week: float = 40) -> float:
    """Convert hourly rate to monthly (assuming ~4.33 weeks/month)."""
    return hourly * hours_per_week * 4.33


# ============================================================
# Major normalization
# ============================================================

MAJOR_ALIASES: dict[str, str] = {
    "cs": "Computer Science",
    "cis": "Computer and Information Science",
    "computer science": "Computer Science",
    "econ": "Economics",
    "economics": "Economics",
    "finance": "Finance",
    "fnce": "Finance",
    "stats": "Statistics",
    "statistics": "Statistics",
    "stat": "Statistics",
    "ee": "Electrical Engineering",
    "electrical engineering": "Electrical Engineering",
    "me": "Mechanical Engineering",
    "mechanical engineering": "Mechanical Engineering",
    "be": "Bioengineering",
    "bioengineering": "Bioengineering",
    "cbe": "Chemical and Biomolecular Engineering",
    "sse": "Systems Science and Engineering",
    "nets": "Networked and Social Systems Engineering",
    "dmd": "Digital Media Design",
}


def normalize_major(raw: str) -> str:
    """Normalize a major name."""
    lower = raw.strip().lower()
    if lower in MAJOR_ALIASES:
        return MAJOR_ALIASES[lower]
    # Title case the original
    return raw.strip().title()


# ============================================================
# Deduplication
# ============================================================

def deduplicate(records: list[dict], keys: tuple[str, ...] = ("company", "role", "year", "season")) -> list[dict]:
    """Remove duplicate records based on key fields. Keeps the record with the most non-None fields."""
    seen: dict[tuple, dict] = {}
    for record in records:
        key = tuple(record.get(k) for k in keys)
        if key in seen:
            existing = seen[key]
            existing_filled = sum(1 for v in existing.values() if v is not None)
            new_filled = sum(1 for v in record.values() if v is not None)
            if new_filled > existing_filled:
                seen[key] = record
        else:
            seen[key] = record
    return list(seen.values())


# ============================================================
# PDF text parsing helpers
# ============================================================

_EMPLOYER_GARBAGE = re.compile(
    r"\b(Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|"
    r"Before|Later|responses|Popular|When|Classes|Page|"
    r"Continuing|Employed|Seeking|Military|Other\b.*\d)"
)


def _clean_employer_name(name: str) -> str:
    """Clean employer name by stripping PDF artifacts like 'Technology\\n1. ' prefixes."""
    # Strip industry header prefixes: "Technology\n1. CompanyName" → "CompanyName"
    # Also handles: "Financial Services\n3. CompanyName", "Education\nCompanyName"
    if "\n" in name:
        parts = name.split("\n")
        # Take the last part which is usually the actual company name
        name = parts[-1].strip()

    # Strip leading numbering like "1. ", "2. ", "3. "
    name = re.sub(r"^\d+\.\s*", "", name).strip()

    return name


def extract_employer_counts(text: str) -> list[tuple[str, int]]:
    """Extract employer names and counts from PDF text like 'Google (26)'."""
    pattern = re.compile(r"([A-Z][\w\s&.\',/()\\n-]+?)\s*\((\d+)\)")
    results = []
    for match in pattern.finditer(text):
        name = _clean_employer_name(match.group(1).strip())
        count = int(match.group(2))
        if (
            count > 0
            and 3 <= len(name) <= 80
            and not _EMPLOYER_GARBAGE.search(name)
            and "%" not in name
            and "$" not in name
        ):
            results.append((name, count))
    return results


_KNOWN_INDUSTRIES = {
    "education", "financial services", "technology", "healthcare", "consulting",
    "nonprofit", "government", "sports/hospitality/food service",
    "media/journalism/entertainment", "engineering/manufacturing",
    "pharmaceuticals/biotechnology", "real estate/construction",
    "retail/wholesale", "retail/wholesale/consumer products",
    "energy/natural resources/utilities", "legal services",
    "marketing/advertising/public relations", "insurance",
    "design/fine arts", "aerospace", "transportation", "consumer products",
    "communications", "manufacturing", "electronics/robotics",
    "manufacturing -other", "other",
}


def extract_industry_percentages(text: str) -> list[tuple[str, float]]:
    """Extract industry names and percentages from PDF text.

    Handles interleaved column text from PDF extraction by matching
    known industry names near percentage values.
    """
    results = []
    seen = set()

    # Strategy: find all "XX% SomeText" patterns, then check if SomeText
    # matches or starts with a known industry name
    p1 = re.compile(r"(\d+(?:\.\d+)?)\s*%\s+([A-Z][A-Za-z\s/&,()-]+)")
    for match in p1.finditer(text):
        pct = float(match.group(1))
        raw = match.group(2).strip()
        if pct > 100 or pct < 0:
            continue

        # Try to find a known industry at the start of the raw text
        raw_lower = raw.lower()
        matched_industry = None
        for known in _KNOWN_INDUSTRIES:
            if raw_lower.startswith(known):
                matched_industry = known
                break

        if matched_industry and matched_industry not in seen:
            results.append((raw[:len(matched_industry)].strip(), pct))
            seen.add(matched_industry)

    # Pattern 2: "Industry Name XX%" (First Destination format)
    if not results:
        p2 = re.compile(r"([A-Z][A-Za-z\s/&,()-]+?)\s+(\d+(?:\.\d+)?)\s*%")
        for match in p2.finditer(text):
            raw = match.group(1).strip()
            pct = float(match.group(2))
            if pct > 100 or pct < 0:
                continue
            raw_lower = raw.lower()
            for known in _KNOWN_INDUSTRIES:
                # Check if the raw text ends with a known industry
                if raw_lower.endswith(known) or raw_lower == known:
                    if known not in seen:
                        results.append((raw[-len(known):].strip(), pct))
                        seen.add(known)
                    break

    return results


def extract_salary_value(text: str, keyword: str) -> Optional[float]:
    """Extract a salary value near a keyword like 'Average' or 'Median'."""
    pattern = re.compile(rf"{keyword}.*?\$\s*([\d,]+(?:\.\d{{1,2}})?)", re.IGNORECASE)
    match = pattern.search(text)
    if match:
        return float(match.group(1).replace(",", ""))
    return None
