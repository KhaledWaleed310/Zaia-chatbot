from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    CONVERTED = "converted"
    LOST = "lost"


class LeadSource(str, Enum):
    CHATBOT = "chatbot"
    MANUAL = "manual"
    IMPORT = "import"
    API = "api"


class LeadFormFieldType(str, Enum):
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    SELECT = "select"
    CHECKBOX = "checkbox"
    TEXTAREA = "textarea"


class LeadFormField(BaseModel):
    id: str
    label: str
    type: LeadFormFieldType = LeadFormFieldType.TEXT
    required: bool = False
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None  # For select fields


class LeadFormConfig(BaseModel):
    enabled: Optional[bool] = None
    title: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[str] = None  # manual, after_messages, on_exit
    trigger_after_messages: Optional[int] = None
    fields: Optional[List[LeadFormField]] = None
    submit_button_text: Optional[str] = None
    success_message: Optional[str] = None


class LeadCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    custom_fields: Dict[str, Any] = {}
    session_id: Optional[str] = None
    source: LeadSource = LeadSource.CHATBOT
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[LeadStatus] = None
    custom_fields: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None


class LeadResponse(BaseModel):
    id: str
    bot_id: str
    tenant_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    source: LeadSource = LeadSource.CHATBOT
    custom_fields: Dict[str, Any] = {}
    session_id: Optional[str] = None
    conversation_summary: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    items: List[LeadResponse]
    total: int
    page: int
    per_page: int
    pages: int


class LeadExportFormat(str, Enum):
    CSV = "csv"
    JSON = "json"


class CRMProvider(str, Enum):
    HUBSPOT = "hubspot"
    SALESFORCE = "salesforce"
    PIPEDRIVE = "pipedrive"
    ZOHO = "zoho"


class CRMIntegrationConfig(BaseModel):
    provider: CRMProvider
    enabled: bool = False
    api_key: Optional[str] = None
    sync_leads: bool = True
    sync_conversations: bool = False
    field_mapping: Dict[str, str] = {}  # Maps our fields to CRM fields


class CRMIntegrationStatus(BaseModel):
    provider: CRMProvider
    connected: bool = False
    last_sync: Optional[datetime] = None
    sync_errors: List[str] = []


class LeadFormSubmission(BaseModel):
    fields: Dict[str, Any]
    session_id: Optional[str] = None
