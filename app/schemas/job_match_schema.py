from typing import List
from pydantic import BaseModel, Field


class MatchBreakdown(BaseModel):

    technical_skills: int = Field(
        ge=0,
        le=100
    )

    experience: int = Field(
        ge=0,
        le=100
    )

    education_qualifications: int = Field(
        ge=0,
        le=100
    )

    projects: int = Field(
        ge=0,
        le=100
    )

    keywords: int = Field(
        ge=0,
        le=100
    )

    overall_match: int = Field(
        ge=0,
        le=100
    )

class SkillMatch(BaseModel):
    name: str

    reason: str = ""


class MissingSkill(BaseModel):
    name: str

    why_it_matters: str = ""

    priority: str = Field(
        description="High, Medium, or Low"
    )


class QualificationGap(BaseModel):
    aspect: str

    job_requirement: str

    resume_status: str

    gap: str


class ATSAnalysis(BaseModel):
    important_keywords_present: List[str]
    important_keywords_missing: List[str]
    keywords_that_could_be_added: List[str]
    recommendations: List[str]


class TailoringSuggestions(BaseModel):
    summary_profile: List[str]
    skills_section: List[str]
    experience: List[str]
    projects: List[str]
    keywords: List[str]


class JobMatchAnalysis(BaseModel):
    score: int = Field(ge=0, le=100)
    classification: str
    explanation: str
    breakdown: MatchBreakdown
    matched_technical_skills: List[SkillMatch]
    matched_soft_skills: List[SkillMatch]
    missing_skills: List[MissingSkill]
    qualification_gaps: List[QualificationGap]
    ats_analysis: ATSAnalysis
    tailoring_suggestions: TailoringSuggestions
    action_plan: List[str]
    final_assessment: str