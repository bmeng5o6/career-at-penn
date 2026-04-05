"""Shared configuration: PDF URLs, industry mappings, company aliases, offset corrections."""

from schema import PennSchool

# ============================================================
# Penn Summer Outcomes PDF URLs (2017-2019)
# ============================================================

SUMMER_OUTCOMES_URLS = {
    "summary": {
        2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2020/07/2019_Undergraduate_Summer.pdf",
        2018: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2018_Undergraduate_Summer.pdf",
        2017: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/11/2017SummerSurvey.pdf",
    },
    "industry": {
        2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2021/04/2019_Industry_Summer.pdf",
        2017: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2017_Industry_Summer.pdf",
    },
    PennSchool.CAS: {
        2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2020/04/2019_CAS_Summer.pdf",
        2018: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2018_CAS_Summer.pdf",
        2017: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2017_CAS_Summer.pdf",
    },
    PennSchool.SEAS: {
        2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2020/04/2019_SEAS_Summer.pdf",
        2018: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2018_SEAS_Summer.pdf",
        2017: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/09/2017_SEAS_Summer.pdf",
    },
    PennSchool.NURSING: {
        2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2020/04/2019_Nursing_Summer.pdf",
        2018: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2018_Nursing_Summer.pdf",
        2017: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2017_Nursing_Summer.pdf",
    },
    PennSchool.WHARTON: {
        2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2020/04/2019_Wharton_Summer.pdf",
        2018: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2018_WH_Summer.pdf",
        2017: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/09/2017_WH_Summer.pdf",
    },
}

# ============================================================
# Penn First Destination PDF URLs
# ============================================================

FIRST_DEST_SCHOOL_URLS = {
    "overall": {
        2021: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2023/10/2021_Undergraduate_Career_Plan_Survey_Report.pdf",
        2020: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2021/02/2020_Undergraduate_Career_Plan_Survey_Report.pdf",
        2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2020/07/2019_Undergraduate_Career_Plan_Survey_Report.pdf",
        2018: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2018_Undergraduate_Career_Plans_Survey_Report.pdf",
        2017: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2019/08/2017_Undergraduate_Career_Plans_Survey_Report.pdf",
    },
    PennSchool.CAS: {
        2024: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2025/04/2024-Career-Plan-CAS-Final.pdf",
        2023: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2024/04/2023-Career-Plan-CAS-Final.pdf",
        2022: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2023/03/2022-Career-Plan-CAS-Final.pdf",
        2021: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2022/03/2021_CAS_Career_Plans_Survey_Report.pdf",
        2020: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2021/07/2020_CAS_Career_Plans_Survey_Report.pdf",
    },
    PennSchool.SEAS: {
        2024: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2025/05/2024-Career-Plan-SEAS-Final.pdf",
        2023: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2024/04/2023-Career-Plan-SEAS-Final.pdf",
        2022: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2023/03/2022-Career-Plan-SEAS-Final.pdf",
        2021: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2022/03/2021_SEAS_Career_Plans_Survey_Report.pdf",
        2020: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2022/04/2020_SEAS_Career_Plans_Survey_Report.pdf",
    },
    PennSchool.WHARTON: {
        2024: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2025/04/2024-Career-Plan-Wharton-Final.pdf",
        2023: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2024/04/2023-Career-Plan-Wharton-Final.pdf",
        2022: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2023/03/2022-Career-Plan-Wharton-Final.pdf",
        2021: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2022/03/2021_Wharton_Career_Plans_Survey_Report.pdf",
        2020: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2021/07/2020_Wharton_Career_Plans_Survey_Report.pdf",
    },
    PennSchool.NURSING: {
        2025: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2026/03/2025-Career-Plan-Nursing-Final.pdf",
        2024: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2025/04/2024-Career-Plan-Nursing-Final.pdf",
        2023: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2024/03/2023-Career-Plan-Nursing-Final.pdf",
        2022: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2023/03/2022-Career-Plan-Nursing-Final.pdf",
        2021: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2022/03/2021_Nursing_Career_Plans_Survey_Report.pdf",
        2020: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2021/02/2020_Nursing_Career_Plans_Survey_Report.pdf",
    },
}

FIRST_DEST_INDUSTRY_URLS = {
    2022: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2023/04/2022-Career-Plan-Industry-Final.pdf",
    2021: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2022/03/2021_Industry_FDS.pdf",
    2020: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2021/03/2020_Industry_FDS.pdf",
    2019: "https://cdn.uconnectlabs.com/wp-content/uploads/sites/74/2020/08/2019_Industry_FDS-1.pdf",
}

# ============================================================
# Industry name normalization
# ============================================================

INDUSTRY_ALIASES: dict[str, str] = {
    # Finance variants
    "finance": "Financial Services",
    "financial services": "Financial Services",
    "banking": "Financial Services",
    "investment banking": "Financial Services",
    # Tech variants
    "technology": "Technology",
    "tech": "Technology",
    "information technology": "Technology",
    "software": "Technology",
    # Consulting variants
    "consulting": "Consulting",
    "management consulting": "Consulting",
    # Healthcare variants
    "healthcare": "Healthcare",
    "health care": "Healthcare",
    "health services": "Healthcare",
    # Education variants
    "education": "Education",
    "higher education": "Education",
    # Nonprofit
    "nonprofit": "Nonprofit",
    "non-profit": "Nonprofit",
    "not-for-profit": "Nonprofit",
    # Government
    "government": "Government",
    "public sector": "Government",
    # Media
    "media/journalism/entertainment": "Media/Journalism/Entertainment",
    "media": "Media/Journalism/Entertainment",
    "entertainment": "Media/Journalism/Entertainment",
    "journalism": "Media/Journalism/Entertainment",
    # Engineering
    "engineering/manufacturing": "Engineering/Manufacturing",
    "engineering": "Engineering/Manufacturing",
    "manufacturing": "Engineering/Manufacturing",
    "manufacturing -other": "Engineering/Manufacturing",
    # Pharma
    "pharmaceuticals/biotechnology": "Pharmaceuticals/Biotechnology",
    "pharma": "Pharmaceuticals/Biotechnology",
    "biotech": "Pharmaceuticals/Biotechnology",
    "biotechnology": "Pharmaceuticals/Biotechnology",
    # Real estate
    "real estate/construction": "Real Estate/Construction",
    "real estate": "Real Estate/Construction",
    "construction": "Real Estate/Construction",
    # Retail
    "retail/wholesale": "Retail/Wholesale/Consumer Products",
    "retail/wholesale/consumer products": "Retail/Wholesale/Consumer Products",
    "retail": "Retail/Wholesale/Consumer Products",
    "consumer products": "Retail/Wholesale/Consumer Products",
    # Energy
    "energy/natural resources/utilities": "Energy/Natural Resources/Utilities",
    "energy": "Energy/Natural Resources/Utilities",
    "utilities": "Energy/Natural Resources/Utilities",
    # Legal
    "legal services": "Legal Services",
    "legal": "Legal Services",
    # Marketing
    "marketing/advertising/public relations": "Marketing/Advertising/Public Relations",
    "marketing": "Marketing/Advertising/Public Relations",
    "advertising": "Marketing/Advertising/Public Relations",
    "public relations": "Marketing/Advertising/Public Relations",
    # Insurance
    "insurance": "Insurance",
    # Sports/Hospitality
    "sports/hospitality/food service": "Sports/Hospitality/Food Service",
    "hospitality": "Sports/Hospitality/Food Service",
    "food service": "Sports/Hospitality/Food Service",
    # Design
    "design/fine arts": "Design/Fine Arts",
    "design": "Design/Fine Arts",
    "fine arts": "Design/Fine Arts",
    # Aerospace
    "aerospace": "Aerospace",
    # Transportation
    "transportation": "Transportation",
    # Other
    "other": "Other",
}

# ============================================================
# Company name aliases for fuzzy matching
# ============================================================

COMPANY_ALIASES: dict[str, str] = {
    "gs": "Goldman Sachs",
    "goldman": "Goldman Sachs",
    "goldman sachs & co.": "Goldman Sachs",
    "goldman sachs group": "Goldman Sachs",
    "jpmorgan": "JPMorgan Chase & Co.",
    "jp morgan": "JPMorgan Chase & Co.",
    "jpmorgan chase": "JPMorgan Chase & Co.",
    "jpmorgan chase & co.": "JPMorgan Chase & Co.",
    "j.p. morgan": "JPMorgan Chase & Co.",
    "morgan stanley & co.": "Morgan Stanley",
    "bofa": "Bank of America",
    "bank of america merrill lynch": "Bank of America",
    "merrill lynch": "Bank of America",
    "fb": "Meta",
    "facebook": "Meta",
    "meta platforms": "Meta",
    "google llc": "Google",
    "alphabet": "Google",
    "msft": "Microsoft",
    "microsoft corporation": "Microsoft",
    "amzn": "Amazon",
    "amazon.com": "Amazon",
    "amazon web services": "Amazon",
    "aws": "Amazon",
    "mckinsey": "McKinsey & Company",
    "mckinsey and company": "McKinsey & Company",
    "bcg": "Boston Consulting Group",
    "the boston consulting group": "Boston Consulting Group",
    "bain": "Bain & Company",
    "bain and company": "Bain & Company",
    "deloitte consulting": "Deloitte",
    "deloitte llp": "Deloitte",
    "sig": "Susquehanna International Group (SIG)",
    "susquehanna": "Susquehanna International Group (SIG)",
    "susquehanna international group": "Susquehanna International Group (SIG)",
    "citadel securities": "Citadel and Citadel Securities",
    "citadel llc": "Citadel and Citadel Securities",
    "children's hospital of philadelphia": "Children's Hospital of Philadelphia (CHOP)",
    "chop": "Children's Hospital of Philadelphia (CHOP)",
    "upenn": "University of Pennsylvania",
    "penn": "University of Pennsylvania",
    "university of pennsylvania": "University of Pennsylvania",
    "penn medicine": "Penn Medicine",
    "uphs": "Penn Medicine",
    "hospital of the university of pennsylvania": "Penn Medicine",
    "spacex": "SpaceX",
    "space exploration technologies": "SpaceX",
    # Comcast
    "comcast": "Comcast",
    "comcast nbcuniversal": "Comcast",
    "comcast corporation": "Comcast",
    "nbcuniversal": "Comcast",
    # Pfizer
    "pfizer": "Pfizer",
    "pfizer inc.": "Pfizer",
    "pfizer inc": "Pfizer",
    # PwC
    "pwc": "PricewaterhouseCoopers (PwC)",
    "pricewaterhousecoopers": "PricewaterhouseCoopers (PwC)",
    "pricewaterhousecoopers (pwc)": "PricewaterhouseCoopers (PwC)",
    # Blackstone
    "blackstone": "Blackstone",
    "the blackstone group": "Blackstone",
    "blackstone group": "Blackstone",
    # EY
    "ey": "EY",
    "ey-parthenon": "EY",
    "ernst & young": "EY",
    "ernst and young": "EY",
    # Evercore
    "evercore": "Evercore",
    "evercore partners": "Evercore",
    # Gartner
    "gartner": "Gartner",
    "gartner inc.": "Gartner",
    # Teach For America
    "teach for america": "Teach For America",
    "tfa": "Teach For America",
    # Accenture
    "accenture": "Accenture",
    "accenture llp": "Accenture",
    # Capital One
    "capital one": "Capital One",
    "capital one financial": "Capital One",
    # Citi
    "citi": "Citi",
    "citigroup": "Citi",
    "citibank": "Citi",
    # Five Rings
    "five rings": "Five Rings",
    "five rings capital": "Five Rings",
    # Palantir
    "palantir": "Palantir Technologies",
    "palantir technologies": "Palantir Technologies",
    # Tesla
    "tesla": "Tesla",
    "tesla motors": "Tesla",
    "tesla inc.": "Tesla",
    # Netflix
    "netflix": "Netflix",
    "netflix inc.": "Netflix",
    # Apple
    "apple": "Apple",
    "apple inc.": "Apple",
    # Credit Suisse
    "credit suisse": "Credit Suisse",
    "credit suisse group": "Credit Suisse",
    # Deutsche Bank
    "deutsche bank": "Deutsche Bank",
    "deutsche bank ag": "Deutsche Bank",
    # Wells Fargo
    "wells fargo": "Wells Fargo",
    "wells fargo & company": "Wells Fargo",
    # Oliver Wyman
    "oliver wyman": "Oliver Wyman",
    # Barclays
    "barclays": "Barclays",
    "barclays capital": "Barclays",
    # IBM
    "ibm": "IBM",
    "international business machines": "IBM",
    # Boston Consulting Group variants
    "boston consulting group (bcg)": "Boston Consulting Group",
}

# ============================================================
# Structural offset corrections (from backtest)
# Summer Outcomes systematically differ from First Destination by these amounts.
# Positive = First Dest is higher than Summer; Negative = Summer is higher.
# ============================================================

INDUSTRY_OFFSETS: dict[str, float] = {
    "Consulting": 7.0,        # First Dest ~7pp higher than Summer
    "Education": -6.0,        # Summer ~6pp higher than First Dest
    "Healthcare": 2.5,        # First Dest ~2.5pp higher
    "Financial Services": 0.0,  # roughly aligned (but volatile)
    "Technology": 0.0,          # roughly aligned
    "Nonprofit": -2.0,         # Summer ~2pp higher
}

# Industries not listed above get offset = 0 (no correction).

# ============================================================
# COVID exclusion years
# ============================================================

COVID_EXCLUSION_YEARS = {2020, 2021}
