from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CompanySize(str, Enum):
    solo = "1"
    small = "2-10"
    medium = "11-50"
    large = "51-200"
    enterprise = "201-500"
    large_enterprise = "500+"


class Industry(str, Enum):
    technology = "Technology"
    ecommerce = "E-commerce"
    healthcare = "Healthcare"
    finance = "Finance & Banking"
    education = "Education"
    real_estate = "Real Estate"
    marketing = "Marketing & Advertising"
    consulting = "Consulting"
    retail = "Retail"
    manufacturing = "Manufacturing"
    hospitality = "Hospitality & Travel"
    legal = "Legal"
    nonprofit = "Non-profit"
    government = "Government"
    media = "Media & Entertainment"
    other = "Other"


class UseCase(str, Enum):
    customer_support = "Customer Support"
    sales = "Sales & Lead Generation"
    internal_knowledge = "Internal Knowledge Base"
    product_info = "Product Information"
    onboarding = "Employee Onboarding"
    faq = "FAQ Automation"
    research = "Research Assistant"
    other = "Other"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None
    use_case: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    country: Optional[str] = None
    referral_source: Optional[str] = None  # How did you hear about us?


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    company_name: Optional[str] = None
    role: str = "user"
    is_admin: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
