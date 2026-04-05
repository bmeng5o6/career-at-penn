"""Pydantic models for internship data — single source of truth for all scrapers and analysis."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Industry(str, Enum):
    TECHNOLOGY = "Technology"
    FINANCIAL_SERVICES = "Financial Services"
    CONSULTING = "Consulting"
    HEALTHCARE = "Healthcare"
    EDUCATION = "Education"
    NONPROFIT = "Nonprofit"
    GOVERNMENT = "Government"
    MEDIA_ENTERTAINMENT = "Media/Journalism/Entertainment"
    ENGINEERING_MANUFACTURING = "Engineering/Manufacturing"
    PHARMA_BIOTECH = "Pharmaceuticals/Biotechnology"
    REAL_ESTATE = "Real Estate/Construction"
    RETAIL_CONSUMER = "Retail/Wholesale/Consumer Products"
    ENERGY = "Energy/Natural Resources/Utilities"
    LEGAL = "Legal Services"
    MARKETING_ADVERTISING = "Marketing/Advertising/Public Relations"
    INSURANCE = "Insurance"
    SPORTS_HOSPITALITY = "Sports/Hospitality/Food Service"
    DESIGN = "Design/Fine Arts"
    AEROSPACE = "Aerospace"
    TRANSPORTATION = "Transportation"
    OTHER = "Other"


class CompensationType(str, Enum):
    HOURLY = "hourly"
    MONTHLY = "monthly"
    ANNUAL = "annual"
    STIPEND = "stipend"
    UNPAID = "unpaid"
    UNKNOWN = "unknown"


class PennSchool(str, Enum):
    CAS = "CAS"
    SEAS = "SEAS"
    WHARTON = "Wharton"
    NURSING = "Nursing"


class Season(str, Enum):
    SUMMER = "summer"
    FALL = "fall"
    SPRING = "spring"
    WINTER = "winter"


class RemoteStatus(str, Enum):
    IN_PERSON = "in-person"
    REMOTE = "remote"
    HYBRID = "hybrid"


class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DataSource(str, Enum):
    PENN_SUMMER_OUTCOMES = "penn_summer_outcomes"
    PENN_FIRST_DESTINATION = "penn_first_destination"
    LEVELS_FYI = "levels_fyi"
    PROJECTED = "projected"
    ENRICHED = "enriched"


class InternshipRecord(BaseModel):
    """A single internship data record — either scraped, projected, or enriched."""

    id: UUID = Field(default_factory=uuid4)
    company: str
    role: Optional[str] = None
    industry: Optional[str] = None
    compensation_type: Optional[CompensationType] = None
    compensation_amount: Optional[float] = None
    major: Optional[str] = None
    school: Optional[PennSchool] = None
    graduation_year: Optional[int] = None
    location: Optional[str] = None
    remote_status: Optional[RemoteStatus] = None
    season: Season = Season.SUMMER
    year: int
    source: DataSource
    source_url: Optional[str] = None
    is_projected: bool = False
    projection_method: Optional[str] = None
    confidence: Optional[Confidence] = None
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class EmployerCount(BaseModel):
    """An employer with a count of students — from Penn PDFs."""

    company: str
    count: int
    school: Optional[PennSchool] = None
    year: int
    source: DataSource


class IndustryBreakdown(BaseModel):
    """Industry percentage for a school/year — from Penn PDFs."""

    industry: str
    percentage: float
    school: Optional[PennSchool] = None
    class_year: Optional[str] = None  # "Rising Seniors", "Rising Juniors", etc. for Summer
    year: int
    source: DataSource


class SalaryStats(BaseModel):
    """Salary statistics for a school/year — from Penn PDFs."""

    school: Optional[PennSchool] = None
    class_year: Optional[str] = None
    year: int
    average: Optional[float] = None
    median: Optional[float] = None
    range_low: Optional[float] = None
    range_high: Optional[float] = None
    compensation_type: CompensationType  # monthly for Summer, annual for First Dest
    respondent_count: Optional[int] = None
    source: DataSource
