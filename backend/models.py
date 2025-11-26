from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from decimal import Decimal
import uuid

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "rep"
    territory_id: Optional[str] = None
    manager_id: Optional[str] = None
    active: bool = True

class UserCreate(UserBase):
    password: Optional[str] = None
    google_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    user: 'User'

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    sku: str
    name: str
    category: str
    commission_rate_code: str
    gross_margin_percent: Decimal
    base_commission_rate: Decimal

class Product(ProductCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    eligible: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    sales_rep_id: str
    product_id: str
    quantity: int
    unit_price: Decimal
    transaction_date: datetime

class Transaction(TransactionCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_amount: Decimal = Decimal("0")
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class CommissionCalculation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str
    sales_rep_id: str
    plan_id: str
    base_amount: Decimal
    commission_amount: Decimal
    adjustments: Decimal = Decimal("0")
    final_amount: Decimal
    holdback_amount: Decimal = Decimal("0")
    calculation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "calculated"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionPlanCreate(BaseModel):
    name: str
    plan_type: str
    rules: Dict[str, Any]
    effective_start: datetime
    effective_end: Optional[datetime] = None

class CommissionPlan(CommissionPlanCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreditAssignmentCreate(BaseModel):
    transaction_id: str
    assignments: List[Dict[str, Any]]

class CreditAssignment(CreditAssignmentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_credit_percent: Decimal = Decimal("100")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SpiffCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    target_products: List[str] = []
    target_segments: List[str] = []
    incentive_amount: Decimal
    incentive_type: str = "fixed"
    eligibility_criteria: Dict[str, Any] = {}

class Spiff(SpiffCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "draft"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Enhanced Partner Model with Documents and Approvals
class PartnerDocument(BaseModel):
    document_type: str
    document_name: str
    document_url: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None

class PartnerApprovalStep(BaseModel):
    level: int
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    status: str = "pending"
    action_date: Optional[datetime] = None
    comments: Optional[str] = None
    rejection_reason: Optional[str] = None

class PartnerCreate(BaseModel):
    company_name: str
    contact_name: str
    contact_email: str
    phone: Optional[str] = None
    website: Optional[str] = None
    business_type: Optional[str] = None
    tax_id: Optional[str] = None
    years_in_business: Optional[int] = None
    number_of_employees: Optional[int] = None
    expected_monthly_volume: Optional[str] = None
    business_address: Optional[str] = None
    tier: str = "bronze"

class Partner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    contact_name: str
    contact_email: str
    user_id: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    business_type: Optional[str] = None
    tax_id: Optional[str] = None
    years_in_business: Optional[int] = None
    number_of_employees: Optional[int] = None
    expected_monthly_volume: Optional[str] = None
    business_address: Optional[str] = None
    tier: str = "bronze"
    status: str = "pending_level1"
    onboarding_progress: int = 0
    documents: List[PartnerDocument] = []
    approval_workflow: List[PartnerApprovalStep] = []
    assigned_products: List[str] = []
    rejection_count: int = 0
    on_hold: bool = False
    hold_reason: Optional[str] = None
    disqualified: bool = False
    disqualification_reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApprovalWorkflowCreate(BaseModel):
    workflow_type: str
    resource_id: str
    steps: List[Dict[str, Any]]

class ApprovalWorkflow(ApprovalWorkflowCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    initiated_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayoutCreate(BaseModel):
    user_id: str
    payout_period_start: datetime
    payout_period_end: datetime

class Payout(PayoutCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_commission: Decimal = Decimal("0")
    adjustments: Decimal = Decimal("0")
    deductions: Decimal = Decimal("0")
    net_payout: Decimal = Decimal("0")
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class TerritoryCreate(BaseModel):
    name: str
    region: str
    account_list: List[str] = []

class Territory(TerritoryCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_rep_id: Optional[str] = None
    account_potential: Decimal = Decimal("0")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuotaCreate(BaseModel):
    user_id: str
    period_start: datetime
    period_end: datetime
    quota_amount: Decimal
    quota_type: str = "revenue"
    assignment_method: str = "top_down"

class Quota(QuotaCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_attainment: Decimal = Decimal("0")
    attainment_percent: Decimal = Decimal("0")
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ForecastCreate(BaseModel):
    scenario_name: str
    period_start: datetime
    period_end: datetime
    assumptions: Dict[str, Any] = {}

class Forecast(ForecastCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    projected_revenue: Decimal = Decimal("0")
    projected_payout: Decimal = Decimal("0")
    projected_cos_percent: Decimal = Decimal("0")
    variance_from_current: Decimal = Decimal("0")
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    subject: str
    description: str
    category: str = "general"
    severity: str = "medium"

class Ticket(TicketCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    submitted_by: str
    assigned_to: Optional[str] = None
    status: str = "new"
    sla_hours: int = 48
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class NFMCreate(BaseModel):
    user_id: str
    metric_name: str
    target_value: Decimal
    actual_value: Decimal = Decimal("0")
    measurement_period: str

class NFM(NFMCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    multiplier_effect: Optional[Decimal] = None
    threshold_requirement: Optional[Decimal] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EligibilityRuleCreate(BaseModel):
    product_type: str
    sales_channel: str
    customer_segment: str
    eligible: bool = True
    commission_rate_override: Optional[Decimal] = None
    effective_start: datetime
    effective_end: Optional[datetime] = None

class EligibilityRule(EligibilityRuleCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DataSourceMappingCreate(BaseModel):
    source_name: str
    source_type: str
    connection_string: str
    field_mappings: Dict[str, str]
    schedule: Optional[str] = None

class DataSourceMapping(DataSourceMappingCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action_type: str
    resource_type: str
    resource_id: str
    state_before: Optional[Dict[str, Any]] = None
    state_after: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomRoleCreate(BaseModel):
    name: str
    description: str
    permissions: List[str] = []
    is_custom: bool = True

class CustomRole(CustomRoleCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomGroupCreate(BaseModel):
    name: str
    description: str
    role_id: Optional[str] = None
    permissions: List[str] = []
    user_ids: List[str] = []

class CustomGroup(CustomGroupCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
