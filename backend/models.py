from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
from decimal import Decimal
import uuid

# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Literal["admin", "finance", "manager", "rep", "partner"]
    territory_id: Optional[str] = None
    manager_id: Optional[str] = None
    active: bool = True

class UserCreate(UserBase):
    password: Optional[str] = None  # Optional for Google OAuth
    google_id: Optional[str] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# Product Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    name: str
    category: str
    commission_rate_code: str
    gross_margin_percent: Decimal = Field(default=Decimal("0.0000"))
    base_commission_rate: Decimal = Field(default=Decimal("0.0000"))
    eligible: bool = False
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    sku: str
    name: str
    category: str
    commission_rate_code: str
    gross_margin_percent: Decimal
    base_commission_rate: Decimal

# Transaction Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_date: datetime
    product_id: str
    sku: str
    quantity: int
    unit_price: Decimal = Field(default=Decimal("0.0000"))
    total_amount: Decimal = Field(default=Decimal("0.0000"))
    sales_rep_id: str
    customer_id: str
    customer_segment: str
    sales_channel: str
    territory_id: str
    status: Literal["pending", "processed", "error"] = "pending"
    processed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    transaction_date: datetime
    product_id: str
    sku: str
    quantity: int
    unit_price: Decimal
    sales_rep_id: str
    customer_id: str
    customer_segment: str
    sales_channel: str
    territory_id: str

# Commission Plan Models
class CommissionRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rule_type: Literal["flat", "tiered", "percentage", "formula", "multiplier"]
    condition: Dict[str, Any] = {}
    action: Dict[str, Any] = {}
    tier_thresholds: Optional[List[Dict[str, Any]]] = None
    formula: Optional[str] = None
    priority: int = 0

class CommissionPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    plan_type: Literal["individual", "team", "partner"]
    effective_start: datetime
    effective_end: Optional[datetime] = None
    rules: List[CommissionRule] = []
    status: Literal["draft", "active", "archived"] = "draft"
    version: int = 1
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionPlanCreate(BaseModel):
    name: str
    description: str
    plan_type: Literal["individual", "team", "partner"]
    effective_start: datetime
    effective_end: Optional[datetime] = None
    rules: List[CommissionRule] = []

# Commission Calculation Models
class CommissionCalculation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str
    sales_rep_id: str
    plan_id: str
    calculation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    base_amount: Decimal = Field(default=Decimal("0.0000"))
    commission_amount: Decimal = Field(default=Decimal("0.0000"))
    adjustments: Decimal = Field(default=Decimal("0.0000"))
    final_amount: Decimal = Field(default=Decimal("0.0000"))
    holdback_amount: Decimal = Field(default=Decimal("0.0000"))
    holdback_release_date: Optional[datetime] = None
    status: Literal["calculated", "approved", "paid", "holdback"] = "calculated"
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Credit Assignment Models
class CreditAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str
    assignments: List[Dict[str, Any]] = []  # {user_id, credit_percent, role}
    total_credit_percent: Decimal = Field(default=Decimal("100.0000"))
    assignment_reason: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreditAssignmentCreate(BaseModel):
    transaction_id: str
    assignments: List[Dict[str, Any]]
    assignment_reason: str

# Spiff Models
class Spiff(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    start_date: datetime
    end_date: datetime
    target_products: List[str] = []  # SKUs
    target_segments: List[str] = []
    incentive_amount: Decimal = Field(default=Decimal("0.0000"))
    incentive_type: Literal["fixed", "percentage", "multiplier"]
    eligibility_criteria: Dict[str, Any] = {}
    status: Literal["draft", "active", "ended"] = "draft"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SpiffCreate(BaseModel):
    name: str
    description: str
    start_date: datetime
    end_date: datetime
    target_products: List[str] = []
    target_segments: List[str] = []
    incentive_amount: Decimal
    incentive_type: Literal["fixed", "percentage", "multiplier"]
    eligibility_criteria: Dict[str, Any] = {}

# Partner Models
class Partner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    contact_name: str
    contact_email: EmailStr
    user_id: Optional[str] = None  # Linked user account
    tier: Literal["bronze", "silver", "gold", "platinum"] = "bronze"
    status: Literal["onboarding", "active", "inactive", "suspended"] = "onboarding"
    onboarding_progress: int = 0  # 0-100
    banking_details: Optional[Dict[str, str]] = None
    tax_documents_status: Literal["pending", "submitted", "approved", "rejected"] = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartnerCreate(BaseModel):
    company_name: str
    contact_name: str
    contact_email: EmailStr
    tier: Literal["bronze", "silver", "gold", "platinum"] = "bronze"

# Compliance Document Models
class ComplianceDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    document_type: Literal["tax_form", "banking", "insurance", "contract", "other"]
    document_name: str
    file_path: str
    version: int = 1
    status: Literal["pending", "submitted", "approved", "rejected"] = "pending"
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Approval Workflow Models
class ApprovalStep(BaseModel):
    step_number: int
    approver_id: str
    approver_role: str
    status: Literal["pending", "approved", "rejected"] = "pending"
    comments: Optional[str] = None
    timestamp: Optional[datetime] = None

class ApprovalWorkflow(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_type: Literal["payout", "plan_change", "territory_assignment", "document"]
    reference_id: str  # ID of the item being approved
    reference_type: str
    status: Literal["draft", "submitted", "l1_approved", "l2_approved", "final_approved", "rejected", "recalled"] = "draft"
    steps: List[ApprovalStep] = []
    initiated_by: str
    escalation_alert_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApprovalWorkflowCreate(BaseModel):
    workflow_type: Literal["payout", "plan_change", "territory_assignment", "document"]
    reference_id: str
    reference_type: str
    steps: List[ApprovalStep]

# Payout Models
class Payout(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payout_period_start: datetime
    payout_period_end: datetime
    user_id: str
    total_commission: Decimal = Field(default=Decimal("0.0000"))
    adjustments: Decimal = Field(default=Decimal("0.0000"))
    deductions: Decimal = Field(default=Decimal("0.0000"))
    net_payout: Decimal = Field(default=Decimal("0.0000"))
    currency: str = "USD"
    status: Literal["calculated", "pending_approval", "approved", "processing", "completed", "failed"] = "calculated"
    payment_method: Literal["bank_transfer", "check", "paypal"] = "bank_transfer"
    reconciliation_status: Literal["pending", "matched", "variance_found"] = "pending"
    file_generated: bool = False
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class PayoutCreate(BaseModel):
    payout_period_start: datetime
    payout_period_end: datetime
    user_id: str
    currency: str = "USD"

# Territory Models
class Territory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    geography: List[str] = []  # Regions, states, countries
    account_potential: Decimal = Field(default=Decimal("0.0000"))
    assigned_rep_id: Optional[str] = None
    parent_territory_id: Optional[str] = None
    status: Literal["active", "inactive"] = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TerritoryCreate(BaseModel):
    name: str
    description: str
    geography: List[str] = []
    account_potential: Decimal
    assigned_rep_id: Optional[str] = None

# Quota Models
class Quota(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    period_start: datetime
    period_end: datetime
    quota_amount: Decimal = Field(default=Decimal("0.0000"))
    quota_type: Literal["revenue", "units", "deals"] = "revenue"
    assignment_method: Literal["top_down", "bottom_up"] = "top_down"
    current_attainment: Decimal = Field(default=Decimal("0.0000"))
    attainment_percent: Decimal = Field(default=Decimal("0.0000"))
    status: Literal["draft", "active", "completed"] = "draft"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuotaCreate(BaseModel):
    user_id: str
    period_start: datetime
    period_end: datetime
    quota_amount: Decimal
    quota_type: Literal["revenue", "units", "deals"] = "revenue"
    assignment_method: Literal["top_down", "bottom_up"] = "top_down"

# Forecast Models
class Forecast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scenario_name: str
    period_start: datetime
    period_end: datetime
    projected_revenue: Decimal = Field(default=Decimal("0.0000"))
    projected_payout: Decimal = Field(default=Decimal("0.0000"))
    projected_cos_percent: Decimal = Field(default=Decimal("0.0000"))
    assumptions: Dict[str, Any] = {}
    variance_from_current: Decimal = Field(default=Decimal("0.0000"))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ForecastCreate(BaseModel):
    scenario_name: str
    period_start: datetime
    period_end: datetime
    assumptions: Dict[str, Any] = {}

# NFM (Non-Financial Metric) Models
class NFM(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    metric_name: str
    metric_type: Literal["rate", "count", "duration", "percentage"]
    target_value: Decimal = Field(default=Decimal("0.0000"))
    actual_value: Decimal = Field(default=Decimal("0.0000"))
    user_id: str
    measurement_period: str
    link_to_commission: bool = False
    multiplier_effect: Optional[Decimal] = None
    threshold_requirement: Optional[Decimal] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NFMCreate(BaseModel):
    metric_name: str
    metric_type: Literal["rate", "count", "duration", "percentage"]
    target_value: Decimal
    user_id: str
    measurement_period: str
    link_to_commission: bool = False
    multiplier_effect: Optional[Decimal] = None
    threshold_requirement: Optional[Decimal] = None

# Audit Log Models
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action_type: str
    resource_type: str
    resource_id: str
    state_before: Optional[Dict[str, Any]] = None
    state_after: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Ticket Models
class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str = Field(default_factory=lambda: f"TKT-{uuid.uuid4().hex[:8].upper()}")
    subject: str
    description: str
    category: Literal["dispute", "technical", "data_error", "payout_inquiry", "other"]
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    status: Literal["new", "assigned", "investigating", "resolved", "closed"] = "new"
    submitted_by: str
    assigned_to: Optional[str] = None
    sla_hours: int = 48  # Based on severity
    sla_breach: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    comments: List[Dict[str, Any]] = []  # {user_id, comment, timestamp}

class TicketCreate(BaseModel):
    subject: str
    description: str
    category: Literal["dispute", "technical", "data_error", "payout_inquiry", "other"]
    severity: Literal["low", "medium", "high", "critical"] = "medium"

# Eligibility Matrix Models
class EligibilityRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_type: str
    sales_channel: str
    customer_segment: str
    eligible: bool = True
    commission_rate_override: Optional[Decimal] = None
    effective_start: datetime
    effective_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EligibilityRuleCreate(BaseModel):
    product_type: str
    sales_channel: str
    customer_segment: str
    eligible: bool = True
    commission_rate_override: Optional[Decimal] = None
    effective_start: datetime
    effective_end: Optional[datetime] = None

# Data Source Mapping Models
class DataSourceMapping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_name: str
    source_type: Literal["csv", "api", "database", "webhook"]
    field_mappings: Dict[str, str] = {}  # {external_field: internal_field}
    schedule: Optional[str] = None  # Cron expression
    active: bool = True
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DataSourceMappingCreate(BaseModel):
    source_name: str
    source_type: Literal["csv", "api", "database", "webhook"]
    field_mappings: Dict[str, str]
    schedule: Optional[str] = None
