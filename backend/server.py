from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Header, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json
from decimal import Decimal
import csv
import io

# Import models and utilities
from models import *
from models import CustomRoleCreate, CustomRole, CustomGroupCreate, CustomGroup
from utils.security import verify_password, get_password_hash, create_access_token, verify_token, encrypt_sensitive_data, decrypt_sensitive_data
from utils.validators import validate_credit_distribution, validate_commission_plan_logic, validate_financial_precision, calculate_sla_hours, check_sla_breach

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="SPM/PPM Enterprise System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# WebSocket manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict = {}  # user_id -> websocket

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_text(json.dumps(message))
            except:
                pass

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

manager = ConnectionManager()

# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return User(**user)

# Role-based access control
def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker

# Helper function for audit logs
async def create_audit_log(user_id: str, action_type: str, resource_type: str, resource_id: str, state_before: Optional[dict], state_after: Optional[dict]):
    audit = AuditLog(
        user_id=user_id,
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        state_before=state_before,
        state_after=state_after
    )
    doc = audit.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)

# ============= AUTHENTICATION ENDPOINTS =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    if user_data.password:
        user_dict['password'] = get_password_hash(user_data.password)
    
    user_obj = User(**{k: v for k, v in user_dict.items() if k not in ['password', 'google_id']})
    doc = user_obj.model_dump()
    for key in ['created_at', 'updated_at']:
        if key in doc and isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat()
    
    doc['password'] = user_dict.get('password')
    doc['google_id'] = user_dict.get('google_id')
    
    await db.users.insert_one(doc)
    await create_audit_log(user_obj.id, "user_registration", "user", user_obj.id, None, doc)
    
    access_token = create_access_token(data={"sub": user_obj.id, "role": user_obj.role})
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get('password', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    for key in ['created_at', 'updated_at']:
        if key in user and isinstance(user[key], str):
            user[key] = datetime.fromisoformat(user[key])
    
    user_obj = User(**{k: v for k, v in user.items() if k not in ['password', 'google_id']})
    access_token = create_access_token(data={"sub": user_obj.id, "role": user_obj.role})
    await create_audit_log(user_obj.id, "user_login", "user", user_obj.id, None, None)
    
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/google")
async def google_login(token: dict):
    google_id = token.get('google_id')
    email = token.get('email')
    name = token.get('name')
    
    user = await db.users.find_one({"$or": [{"google_id": google_id}, {"email": email}]}, {"_id": 0})
    
    if not user:
        user_create = UserCreate(email=email, full_name=name, role="rep", google_id=google_id)
        user_dict = user_create.model_dump()
        user_obj = User(**{k: v for k, v in user_dict.items() if k not in ['password', 'google_id']})
        doc = user_obj.model_dump()
        for key in ['created_at', 'updated_at']:
            if key in doc and isinstance(doc[key], datetime):
                doc[key] = doc[key].isoformat()
        doc['google_id'] = google_id
        await db.users.insert_one(doc)
    else:
        for key in ['created_at', 'updated_at']:
            if key in user and isinstance(user[key], str):
                user[key] = datetime.fromisoformat(user[key])
        user_obj = User(**{k: v for k, v in user.items() if k not in ['password', 'google_id']})
    
    access_token = create_access_token(data={"sub": user_obj.id, "role": user_obj.role})
    return Token(access_token=access_token, user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= USER MANAGEMENT ENDPOINTS =============

@api_router.get("/users", response_model=List[User])
async def list_users(current_user: User = Depends(require_role(["admin", "manager"]))):
    users = await db.users.find({}, {"_id": 0, "password": 0, "google_id": 0}).to_list(1000)
    for u in users:
        for key in ['created_at', 'updated_at']:
            if key in u and isinstance(u[key], str):
                u[key] = datetime.fromisoformat(u[key])
    return users

@api_router.patch("/users/{user_id}")
async def update_user(user_id: str, update_data: dict, current_user: User = Depends(require_role(["admin"]))):
    allowed_fields = ['active', 'role', 'territory_id', 'manager_id', 'full_name']
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await create_audit_log(current_user.id, "user_updated", "user", user_id, None, update_dict)
    return {"message": "User updated successfully"}

# ============= PRODUCT ENDPOINTS =============

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    if not product_data.commission_rate_code or product_data.gross_margin_percent <= 0:
        raise HTTPException(status_code=400, detail="Invalid product data")
    
    product = Product(**product_data.model_dump(), eligible=True)
    doc = product.model_dump()
    for key in ['created_at', 'updated_at']:
        doc[key] = doc[key].isoformat()
    for key in ['gross_margin_percent', 'base_commission_rate']:
        doc[key] = str(doc[key])
    
    await db.products.insert_one(doc)
    await create_audit_log(current_user.id, "product_created", "product", product.id, None, doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def list_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for p in products:
        for key in ['created_at', 'updated_at']:
            if isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        for key in ['gross_margin_percent', 'base_commission_rate']:
            p[key] = Decimal(p[key])
    return products

@api_router.post("/products/bulk-upload")
async def bulk_upload_products(file: UploadFile = File(...), current_user: User = Depends(require_role(["admin", "finance"]))):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    csv_file = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(csv_file)
    
    products_created = 0
    errors = []
    
    for row in reader:
        try:
            product = Product(
                sku=row['sku'],
                name=row['name'],
                category=row['category'],
                commission_rate_code=row['commission_rate_code'],
                gross_margin_percent=Decimal(row['gross_margin_percent']),
                base_commission_rate=Decimal(row['base_commission_rate']),
                eligible=True
            )
            doc = product.model_dump()
            for key in ['created_at', 'updated_at']:
                doc[key] = doc[key].isoformat()
            for key in ['gross_margin_percent', 'base_commission_rate']:
                doc[key] = str(doc[key])
            await db.products.insert_one(doc)
            products_created += 1
        except Exception as e:
            errors.append({"row": row, "error": str(e)})
    
    return {"products_created": products_created, "errors": errors}

# ============= OLD TRANSACTION ENDPOINTS (REPLACED BY /api/sales) =============
# These have been replaced by the new sales_commission_routes.py
# Kept here commented for reference only

# @api_router.post("/transactions", response_model=Transaction)
# async def create_transaction(txn_data: TransactionCreate, current_user: User = Depends(require_role(["admin", "manager"]))):
#     # DEPRECATED - Use POST /api/sales instead
#     pass

# @api_router.get("/transactions", response_model=List[Transaction])
# async def list_transactions(current_user: User = Depends(get_current_user), limit: int = 100):
#     # DEPRECATED - Use GET /api/sales instead
#     pass

# ============= OLD COMMISSION CALCULATION (DEPRECATED) =============
# Commission calculation is now automatic when sales are created via POST /api/sales
# The new system calculates: base commission (tier-based) + spiff bonuses

# async def process_transaction_commission(transaction_id: str):
#     # DEPRECATED - Commission calculated automatically in sales_commission_routes.py
#     pass

# @api_router.get("/commissions/my-earnings")
# async def get_my_earnings(current_user: User = Depends(get_current_user)):
#     # DEPRECATED - Use GET /api/analytics/partner/{id} instead
#     pass

# ============= OLD COMMISSION PLAN ENDPOINTS (DEPRECATED) =============
# Commission planning is now done through tier-based commissions + spiff campaigns
# Old complex rule-based system has been replaced

# @api_router.post("/plans", response_model=CommissionPlan)
# async def create_commission_plan(...):
#     # DEPRECATED - Commission structure is now tier-based
#     pass

# @api_router.get("/plans", response_model=List[CommissionPlan])
# async def list_commission_plans(...):
#     # DEPRECATED
#     pass

# @api_router.patch("/plans/{plan_id}")
# async def update_plan(...):
#     # DEPRECATED
#     pass

# ============= CREDIT ASSIGNMENT ENDPOINTS =============

@api_router.post("/credit-assignments")
async def create_credit_assignment(assignment_data: CreditAssignmentCreate, current_user: User = Depends(require_role(["admin", "manager"]))):
    if not validate_credit_distribution(assignment_data.assignments):
        raise HTTPException(status_code=400, detail="Credit distribution must equal 100%")
    
    assignment = CreditAssignment(**assignment_data.model_dump())
    doc = assignment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['total_credit_percent'] = str(doc['total_credit_percent'])
    
    await db.credit_assignments.insert_one(doc)
    await create_audit_log(current_user.id, "credit_assignment_created", "credit_assignment", assignment.id, None, doc)
    return assignment

@api_router.get("/credit-assignments")
async def list_credit_assignments(current_user: User = Depends(get_current_user)):
    assignments = await db.credit_assignments.find({}, {"_id": 0}).to_list(1000)
    for a in assignments:
        if isinstance(a['created_at'], str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
        a['total_credit_percent'] = Decimal(a['total_credit_percent'])
    return assignments

# ============= SPIFF ENDPOINTS =============

@api_router.post("/spiffs")
async def create_spiff(spiff_data: SpiffCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    spiff = Spiff(**spiff_data.model_dump(), created_by=current_user.id)
    doc = spiff.model_dump()
    doc['start_date'] = doc['start_date'].isoformat()
    doc['end_date'] = doc['end_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['incentive_amount'] = str(doc['incentive_amount'])
    
    await db.spiffs.insert_one(doc)
    await create_audit_log(current_user.id, "spiff_created", "spiff", spiff.id, None, doc)
    return spiff

@api_router.get("/spiffs")
async def list_spiffs(current_user: User = Depends(get_current_user)):
    spiffs = await db.spiffs.find({}, {"_id": 0}).to_list(100)
    for s in spiffs:
        for key in ['start_date', 'end_date', 'created_at']:
            if isinstance(s[key], str):
                s[key] = datetime.fromisoformat(s[key])
        s['incentive_amount'] = Decimal(s['incentive_amount'])
    return spiffs

@api_router.get("/spiffs/active")
async def get_active_spiffs(current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    spiffs = await db.spiffs.find({
        "status": "active",
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    for s in spiffs:
        for key in ['start_date', 'end_date', 'created_at']:
            if isinstance(s[key], str):
                s[key] = datetime.fromisoformat(s[key])
        s['incentive_amount'] = Decimal(s['incentive_amount'])
    return spiffs

@api_router.patch("/spiffs/{spiff_id}")
async def update_spiff(spiff_id: str, update_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    result = await db.spiffs.update_one({"id": spiff_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Spiff not found")
    await create_audit_log(current_user.id, "spiff_updated", "spiff", spiff_id, None, update_data)
    return {"message": "Spiff updated successfully"}

# ============= PARTNER ENDPOINTS =============

@api_router.post("/partners/register")
async def register_partner(partner_data: dict):
    partner = Partner(
        company_name=partner_data.get('company_name'),
        contact_person_name=partner_data.get('contact_person_name'),
        contact_person_email=partner_data.get('contact_person_email'),
        contact_person_phone=partner_data.get('contact_person_phone'),
        user_id=partner_data.get('user_id'),
        business_type=partner_data.get('business_type'),
        years_in_business=partner_data.get('years_in_business'),
        number_of_employees=partner_data.get('number_of_employees'),
        expected_monthly_volume=partner_data.get('expected_monthly_volume'),
        website=partner_data.get('website'),
        tier='bronze',
        status='pending_review',
        onboarding_progress=50
    )
    
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['phone'] = partner_data.get('phone')
    doc['website'] = partner_data.get('website')
    doc['business_type'] = partner_data.get('business_type')
    doc['years_in_business'] = partner_data.get('years_in_business')
    doc['number_of_employees'] = partner_data.get('number_of_employees')
    doc['expected_monthly_volume'] = partner_data.get('expected_monthly_volume')
    doc['documents'] = {
        'business_license': partner_data.get('business_license', 'uploaded'),
        'tax_id': partner_data.get('tax_id', 'uploaded'),
        'identity_proof': partner_data.get('identity_proof', 'uploaded'),
        'bank_statement': partner_data.get('bank_statement'),
        'signed_agreement': partner_data.get('signed_agreement')
    }
    doc['review_history'] = []
    doc['submitted_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.partners.insert_one(doc)
    await db.users.update_one({"id": partner.user_id}, {"$set": {"active": False}})
    await create_audit_log(partner.user_id, "partner_registered", "partner", partner.id, None, doc)
    
    return {"message": "Partner registered successfully. Pending admin approval.", "partner_id": partner.id}

@api_router.get("/partners/all")
async def get_all_partners(current_user: User = Depends(get_current_user)):
    if current_user.role == "partner":
        partners = await db.partners.find({"user_id": current_user.id}, {"_id": 0}).to_list(10)
    else:
        partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    
    for p in partners:
        for key in ['created_at', 'updated_at']:
            if key in p and isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        if 'submitted_at' in p and isinstance(p['submitted_at'], str):
            p['submitted_at'] = datetime.fromisoformat(p['submitted_at'])
        if 'approved_at' in p and isinstance(p['approved_at'], str):
            p['approved_at'] = datetime.fromisoformat(p['approved_at'])
    return partners

@api_router.get("/partners/pending")
async def get_pending_partners(current_user: User = Depends(require_role(["admin", "finance"]))):
    partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    for p in partners:
        for key in ['created_at', 'updated_at']:
            if key in p and isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        if 'submitted_at' in p and isinstance(p['submitted_at'], str):
            p['submitted_at'] = datetime.fromisoformat(p['submitted_at'])
        if 'approved_at' in p and isinstance(p['approved_at'], str):
            p['approved_at'] = datetime.fromisoformat(p['approved_at'])
    return partners

@api_router.post("/partners/{partner_id}/approve")
async def approve_partner(partner_id: str, review_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {
        "status": "approved",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_by": current_user.id,
        "onboarding_progress": 100,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    review_history = partner.get('review_history', [])
    review_history.append({
        "action": "approved",
        "comments": review_data.get('comments', ''),
        "reviewer": current_user.full_name,
        "date": datetime.now(timezone.utc).isoformat()
    })
    update_data['review_history'] = review_history
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await db.users.update_one({"id": partner['user_id']}, {"$set": {"active": True}})
    await create_audit_log(current_user.id, "partner_approved", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner approved successfully"}

@api_router.post("/partners/{partner_id}/reject")
async def reject_partner(partner_id: str, review_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {
        "status": "rejected",
        "rejection_reason": review_data.get('reason', 'Application did not meet requirements'),
        "rejected_at": datetime.now(timezone.utc).isoformat(),
        "rejected_by": current_user.id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    review_history = partner.get('review_history', [])
    review_history.append({
        "action": "rejected",
        "comments": review_data.get('reason', ''),
        "reviewer": current_user.full_name,
        "date": datetime.now(timezone.utc).isoformat()
    })
    update_data['review_history'] = review_history
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_rejected", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner rejected"}

@api_router.post("/partners/{partner_id}/request-more")
async def request_more_info(partner_id: str, review_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {
        "status": "more_info_needed",
        "info_request": review_data.get('message', ''),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    review_history = partner.get('review_history', [])
    review_history.append({
        "action": "requested_more_info",
        "comments": review_data.get('message', ''),
        "reviewer": current_user.full_name,
        "date": datetime.now(timezone.utc).isoformat()
    })
    update_data['review_history'] = review_history
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_info_requested", "partner", partner_id, partner, update_data)
    
    return {"message": "Information request sent to partner"}

@api_router.patch("/partners/{partner_id}")
async def update_partner(partner_id: str, update_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    allowed_fields = ['tier', 'status', 'notes']
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_dict})
    await create_audit_log(current_user.id, "partner_updated", "partner", partner_id, partner, update_dict)
    
    return {"message": "Partner updated successfully"}

@api_router.post("/partners/{partner_id}/deactivate")
async def deactivate_partner(partner_id: str, deactivate_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {
        "status": "inactive",
        "deactivation_reason": deactivate_data.get('reason', ''),
        "deactivated_at": datetime.now(timezone.utc).isoformat(),
        "deactivated_by": current_user.id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await db.users.update_one({"id": partner['user_id']}, {"$set": {"active": False}})
    await create_audit_log(current_user.id, "partner_deactivated", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner deactivated successfully"}

@api_router.get("/partners/my-info")
async def get_my_partner_info(current_user: User = Depends(get_current_user)):
    partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner profile not found")
    
    for key in ['created_at', 'updated_at']:
        if isinstance(partner[key], str):
            partner[key] = datetime.fromisoformat(partner[key])
    
    return partner

# ============= ENHANCED PARTNER HUB ENDPOINTS =============

@api_router.post("/partners/admin-create")
async def admin_create_partner(partner_data: PartnerCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Admin-led partner creation with full details"""
    # Initialize approval workflow with L1 and L2 steps
    approval_workflow = [
        PartnerApprovalStep(level=1, status="pending").model_dump(),
        PartnerApprovalStep(level=2, status="pending").model_dump()
    ]
    
    partner = Partner(
        **partner_data.model_dump(),
        status="pending_level1",
        approval_workflow=approval_workflow,
        created_by=current_user.id,
        onboarding_progress=30
    )
    
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('submitted_at'):
        doc['submitted_at'] = doc['submitted_at'].isoformat()
    if doc.get('approved_at'):
        doc['approved_at'] = doc['approved_at'].isoformat()
    
    # Convert approval_workflow dates
    for step in doc['approval_workflow']:
        if step.get('action_date'):
            step['action_date'] = step['action_date'].isoformat()
    
    # Convert documents dates
    for document in doc['documents']:
        if isinstance(document.get('uploaded_at'), datetime):
            document['uploaded_at'] = document['uploaded_at'].isoformat()
        if document.get('verified_at'):
            document['verified_at'] = document['verified_at'].isoformat()
    
    await db.partners.insert_one(doc)
    await create_audit_log(current_user.id, "partner_admin_created", "partner", partner.id, None, doc)
    
    return {"message": "Partner created successfully", "partner_id": partner.id}

@api_router.post("/partners/{partner_id}/upload-document")
async def upload_partner_document(partner_id: str, doc_data: dict, current_user: User = Depends(get_current_user)):
    """Upload a document for a partner (Base64 encoded)"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Check authorization
    if current_user.role not in ["admin", "finance"] and partner.get('user_id') != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_document = PartnerDocument(
        document_type=doc_data['document_type'],
        document_name=doc_data['document_name'],
        document_data=doc_data['document_data']
    )
    
    documents = partner.get('documents', [])
    doc_dict = new_document.model_dump()
    doc_dict['uploaded_at'] = doc_dict['uploaded_at'].isoformat()
    if doc_dict.get('verified_at'):
        doc_dict['verified_at'] = doc_dict['verified_at'].isoformat()
    
    documents.append(doc_dict)
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"documents": documents, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await create_audit_log(current_user.id, "partner_document_uploaded", "partner", partner_id, None, {"document_type": doc_data['document_type']})
    
    return {"message": "Document uploaded successfully"}

@api_router.post("/partners/{partner_id}/submit-l1")
async def submit_for_l1_approval(partner_id: str, current_user: User = Depends(get_current_user)):
    """Submit partner application for Level 1 approval"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Check authorization
    if current_user.role not in ["admin", "finance"] and partner.get('user_id') != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {
        "status": "pending_level1",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "onboarding_progress": 40,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_submitted_l1", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner submitted for Level 1 approval"}

@api_router.post("/partners/{partner_id}/approve-l1")
async def approve_partner_l1(partner_id: str, approval_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Level 1 approval"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    approval_workflow = partner.get('approval_workflow', [])
    
    # Update L1 step
    for step in approval_workflow:
        if step['level'] == 1:
            step['status'] = 'approved'
            step['approver_id'] = current_user.id
            step['approver_name'] = current_user.full_name
            step['action_date'] = datetime.now(timezone.utc).isoformat()
            step['comments'] = approval_data.get('comments', '')
            break
    
    update_data = {
        "status": "pending_level2",
        "approval_workflow": approval_workflow,
        "onboarding_progress": 60,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l1_approved", "partner", partner_id, partner, update_data)
    
    return {"message": "Level 1 approval completed. Partner moved to Level 2 queue."}

@api_router.post("/partners/{partner_id}/reject-l1")
async def reject_partner_l1(partner_id: str, rejection_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Level 1 rejection"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    approval_workflow = partner.get('approval_workflow', [])
    
    # Update L1 step
    for step in approval_workflow:
        if step['level'] == 1:
            step['status'] = 'rejected'
            step['approver_id'] = current_user.id
            step['approver_name'] = current_user.full_name
            step['action_date'] = datetime.now(timezone.utc).isoformat()
            step['rejection_reason'] = rejection_data.get('reason', 'Did not meet requirements')
            step['comments'] = rejection_data.get('comments', '')
            break
    
    rejection_count = partner.get('rejection_count', 0) + 1
    
    update_data = {
        "status": "rejected_level1",
        "approval_workflow": approval_workflow,
        "rejection_count": rejection_count,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l1_rejected", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner application rejected at Level 1"}

@api_router.post("/partners/{partner_id}/approve-l2")
async def approve_partner_l2(partner_id: str, approval_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Level 2 approval - Final approval"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    approval_workflow = partner.get('approval_workflow', [])
    
    # Update L2 step
    for step in approval_workflow:
        if step['level'] == 2:
            step['status'] = 'approved'
            step['approver_id'] = current_user.id
            step['approver_name'] = current_user.full_name
            step['action_date'] = datetime.now(timezone.utc).isoformat()
            step['comments'] = approval_data.get('comments', '')
            break
    
    update_data = {
        "status": "approved",
        "approval_workflow": approval_workflow,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_by": current_user.id,
        "onboarding_progress": 90,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Activate user if exists
    if partner.get('user_id'):
        await db.users.update_one({"id": partner['user_id']}, {"$set": {"active": True}})
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l2_approved", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner fully approved! Ready for product assignment."}

@api_router.post("/partners/{partner_id}/reject-l2")
async def reject_partner_l2(partner_id: str, rejection_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Level 2 rejection"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    approval_workflow = partner.get('approval_workflow', [])
    
    # Update L2 step
    for step in approval_workflow:
        if step['level'] == 2:
            step['status'] = 'rejected'
            step['approver_id'] = current_user.id
            step['approver_name'] = current_user.full_name
            step['action_date'] = datetime.now(timezone.utc).isoformat()
            step['rejection_reason'] = rejection_data.get('reason', 'Did not meet requirements')
            step['comments'] = rejection_data.get('comments', '')
            break
    
    rejection_count = partner.get('rejection_count', 0) + 1
    
    update_data = {
        "status": "rejected_level2",
        "approval_workflow": approval_workflow,
        "rejection_count": rejection_count,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l2_rejected", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner application rejected at Level 2"}

@api_router.post("/partners/{partner_id}/assign-products")
async def assign_products_to_partner(partner_id: str, assignment_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Assign products to an approved partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner['status'] != 'approved':
        raise HTTPException(status_code=400, detail="Partner must be approved before product assignment")
    
    product_ids = assignment_data.get('product_ids', [])
    
    update_data = {
        "assigned_products": product_ids,
        "onboarding_progress": 100,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_products_assigned", "partner", partner_id, partner, update_data)
    
    return {"message": f"Successfully assigned {len(product_ids)} products to partner"}

# Old L1/L2 queue endpoints removed - now handled by partner_hub_routes.py with proper role-based access
# @api_router.get("/partners/l1-queue") - Use partner_hub_routes for L1 approver access
# @api_router.get("/partners/l2-queue") - Use partner_hub_routes for L2 approver access

@api_router.get("/partners/{partner_id}/portal")
async def get_partner_portal(partner_id: str, current_user: User = Depends(get_current_user)):
    """Get detailed partner information for partner portal"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Check authorization
    if current_user.role not in ["admin", "finance"] and partner.get('user_id') != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get assigned products details
    assigned_products = []
    if partner.get('assigned_products'):
        for product_id in partner['assigned_products']:
            product = await db.products.find_one({"id": product_id}, {"_id": 0})
            if product:
                for key in ['created_at', 'updated_at']:
                    if isinstance(product[key], str):
                        product[key] = datetime.fromisoformat(product[key])
                for key in ['gross_margin_percent', 'base_commission_rate']:
                    product[key] = str(product[key])
                assigned_products.append(product)
    
    # Convert dates
    for key in ['created_at', 'updated_at']:
        if key in partner and isinstance(partner[key], str):
            partner[key] = datetime.fromisoformat(partner[key])
    if 'submitted_at' in partner and partner['submitted_at'] and isinstance(partner['submitted_at'], str):
        partner['submitted_at'] = datetime.fromisoformat(partner['submitted_at'])
    if 'approved_at' in partner and partner['approved_at'] and isinstance(partner['approved_at'], str):
        partner['approved_at'] = datetime.fromisoformat(partner['approved_at'])
    
    return {
        "partner": partner,
        "assigned_products": assigned_products
    }

# ============= APPROVAL WORKFLOW ENDPOINTS =============

@api_router.post("/workflows")
async def create_approval_workflow(workflow_data: ApprovalWorkflowCreate, current_user: User = Depends(require_role(["admin", "finance", "manager"]))):
    workflow = ApprovalWorkflow(**workflow_data.model_dump(), initiated_by=current_user.id)
    doc = workflow.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.approval_workflows.insert_one(doc)
    await create_audit_log(current_user.id, "workflow_created", "workflow", workflow.id, None, doc)
    return workflow

@api_router.get("/workflows")
async def list_workflows(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role not in ["admin", "finance"]:
        query["$or"] = [
            {"initiated_by": current_user.id},
            {"steps.approver_id": current_user.id}
        ]
    
    workflows = await db.approval_workflows.find(query, {"_id": 0}).to_list(100)
    for w in workflows:
        for key in ['created_at', 'updated_at']:
            if isinstance(w[key], str):
                w[key] = datetime.fromisoformat(w[key])
    return workflows

@api_router.get("/workflows/my-approvals")
async def get_my_pending_approvals(current_user: User = Depends(get_current_user)):
    workflows = await db.approval_workflows.find({
        "steps": {
            "$elemMatch": {
                "approver_id": current_user.id,
                "status": "pending"
            }
        }
    }, {"_id": 0}).to_list(100)
    
    for w in workflows:
        for key in ['created_at', 'updated_at']:
            if isinstance(w[key], str):
                w[key] = datetime.fromisoformat(w[key])
    return workflows

@api_router.post("/workflows/{workflow_id}/approve")
async def approve_workflow_step(workflow_id: str, step_data: dict, current_user: User = Depends(get_current_user)):
    workflow = await db.approval_workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    step_number = step_data.get('step_number')
    comments = step_data.get('comments', '')
    
    updated = False
    for step in workflow['steps']:
        if step['step_number'] == step_number and step['approver_id'] == current_user.id:
            step['status'] = 'approved'
            step['timestamp'] = datetime.now(timezone.utc).isoformat()
            step['comments'] = comments
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=403, detail="Not authorized to approve this step")
    
    all_approved = all(s['status'] == 'approved' for s in workflow['steps'])
    if all_approved:
        workflow['status'] = 'final_approved'
    
    await db.approval_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"steps": workflow['steps'], "status": workflow['status'], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await create_audit_log(current_user.id, "workflow_approved", "workflow", workflow_id, None, {"step": step_number})
    return {"message": "Step approved", "workflow_status": workflow['status']}

@api_router.post("/workflows/{workflow_id}/reject")
async def reject_workflow(workflow_id: str, rejection_data: dict, current_user: User = Depends(get_current_user)):
    workflow = await db.approval_workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    step_number = rejection_data.get('step_number')
    comments = rejection_data.get('comments', '')
    
    for step in workflow['steps']:
        if step['step_number'] == step_number and step['approver_id'] == current_user.id:
            step['status'] = 'rejected'
            step['timestamp'] = datetime.now(timezone.utc).isoformat()
            step['comments'] = comments
            break
    
    workflow['status'] = 'rejected'
    
    await db.approval_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"steps": workflow['steps'], "status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await create_audit_log(current_user.id, "workflow_rejected", "workflow", workflow_id, None, {"step": step_number})
    return {"message": "Workflow rejected"}

@api_router.post("/workflows/{workflow_id}/recall")
async def recall_workflow(workflow_id: str, current_user: User = Depends(get_current_user)):
    workflow = await db.approval_workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if workflow['initiated_by'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only initiator can recall workflow")
    
    await db.approval_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"status": "recalled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await create_audit_log(current_user.id, "workflow_recalled", "workflow", workflow_id, None, None)
    return {"message": "Workflow recalled"}

# ============= PAYOUT ENDPOINTS =============

@api_router.post("/payouts")
async def create_payout(payout_data: PayoutCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    calculations = await db.commission_calculations.find({
        "sales_rep_id": payout_data.user_id,
        "calculation_date": {
            "$gte": payout_data.payout_period_start.isoformat(),
            "$lte": payout_data.payout_period_end.isoformat()
        },
        "status": "approved"
    }, {"_id": 0}).to_list(1000)
    
    total_commission = sum(Decimal(c['final_amount']) for c in calculations)
    
    payout = Payout(
        **payout_data.model_dump(),
        total_commission=total_commission,
        net_payout=total_commission
    )
    
    doc = payout.model_dump()
    doc['payout_period_start'] = doc['payout_period_start'].isoformat()
    doc['payout_period_end'] = doc['payout_period_end'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    for key in ['total_commission', 'adjustments', 'deductions', 'net_payout']:
        doc[key] = str(doc[key])
    
    await db.payouts.insert_one(doc)
    await create_audit_log(current_user.id, "payout_created", "payout", payout.id, None, doc)
    return payout

@api_router.get("/payouts")
async def list_payouts(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role in ["rep", "partner"]:
        query["user_id"] = current_user.id
    
    payouts = await db.payouts.find(query, {"_id": 0}).to_list(100)
    for p in payouts:
        for key in ['payout_period_start', 'payout_period_end', 'created_at']:
            if isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        if p.get('processed_at') and isinstance(p['processed_at'], str):
            p['processed_at'] = datetime.fromisoformat(p['processed_at'])
        for key in ['total_commission', 'adjustments', 'deductions', 'net_payout']:
            p[key] = Decimal(p[key])
    return payouts

@api_router.get("/payouts/my-payouts")
async def get_my_payouts(current_user: User = Depends(get_current_user)):
    payouts = await db.payouts.find({"user_id": current_user.id}, {"_id": 0}).to_list(100)
    for p in payouts:
        for key in ['payout_period_start', 'payout_period_end', 'created_at']:
            if isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        if p.get('processed_at') and isinstance(p['processed_at'], str):
            p['processed_at'] = datetime.fromisoformat(p['processed_at'])
        for key in ['total_commission', 'adjustments', 'deductions', 'net_payout']:
            p[key] = Decimal(p[key])
    return payouts

@api_router.post("/payouts/{payout_id}/approve")
async def approve_payout(payout_id: str, current_user: User = Depends(require_role(["admin", "finance"]))):
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {"status": "approved", "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    await create_audit_log(current_user.id, "payout_approved", "payout", payout_id, None, None)
    return {"message": "Payout approved"}

@api_router.get("/payouts/{payout_id}/export")
async def export_payout(payout_id: str, format: str = "csv", current_user: User = Depends(require_role(["admin", "finance"]))):
    payout = await db.payouts.find_one({"id": payout_id}, {"_id": 0})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    return {"message": f"Payout export in {format} format", "data": payout}

# ============= TERRITORY ENDPOINTS =============

@api_router.post("/territories")
async def create_territory(territory_data: TerritoryCreate, current_user: User = Depends(require_role(["admin", "manager"]))):
    territory = Territory(**territory_data.model_dump())
    doc = territory.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['account_potential'] = str(doc['account_potential'])
    
    await db.territories.insert_one(doc)
    await create_audit_log(current_user.id, "territory_created", "territory", territory.id, None, doc)
    return territory

@api_router.get("/territories")
async def list_territories(current_user: User = Depends(get_current_user)):
    territories = await db.territories.find({}, {"_id": 0}).to_list(100)
    for t in territories:
        for key in ['created_at', 'updated_at']:
            if isinstance(t[key], str):
                t[key] = datetime.fromisoformat(t[key])
        t['account_potential'] = Decimal(t['account_potential'])
    return territories

@api_router.patch("/territories/{territory_id}")
async def update_territory(territory_id: str, update_data: dict, current_user: User = Depends(require_role(["admin", "manager"]))):
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.territories.update_one({"id": territory_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Territory not found")
    await create_audit_log(current_user.id, "territory_updated", "territory", territory_id, None, update_data)
    return {"message": "Territory updated"}

@api_router.post("/territories/{territory_id}/assign")
async def assign_territory(territory_id: str, assignment_data: dict, current_user: User = Depends(require_role(["admin", "manager"]))):
    rep_id = assignment_data.get('rep_id')
    await db.territories.update_one(
        {"id": territory_id},
        {"$set": {"assigned_rep_id": rep_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await create_audit_log(current_user.id, "territory_assigned", "territory", territory_id, None, {"rep_id": rep_id})
    return {"message": "Territory assigned"}

# ============= QUOTA ENDPOINTS =============

@api_router.post("/quotas")
async def create_quota(quota_data: QuotaCreate, current_user: User = Depends(require_role(["admin", "manager"]))):
    quota = Quota(**quota_data.model_dump())
    doc = quota.model_dump()
    doc['period_start'] = doc['period_start'].isoformat()
    doc['period_end'] = doc['period_end'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    for key in ['quota_amount', 'current_attainment', 'attainment_percent']:
        doc[key] = str(doc[key])
    
    await db.quotas.insert_one(doc)
    await create_audit_log(current_user.id, "quota_created", "quota", quota.id, None, doc)
    return quota

@api_router.get("/quotas")
async def list_quotas(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role in ["rep", "partner"]:
        query["user_id"] = current_user.id
    
    quotas = await db.quotas.find(query, {"_id": 0}).to_list(100)
    for q in quotas:
        for key in ['period_start', 'period_end', 'created_at', 'updated_at']:
            if isinstance(q[key], str):
                q[key] = datetime.fromisoformat(q[key])
        for key in ['quota_amount', 'current_attainment', 'attainment_percent']:
            q[key] = Decimal(q[key])
    return quotas

@api_router.get("/quotas/my-quota")
async def get_my_quota(current_user: User = Depends(get_current_user)):
    quota = await db.quotas.find_one({"user_id": current_user.id, "status": "active"}, {"_id": 0})
    if not quota:
        return {"message": "No active quota found"}
    
    for key in ['period_start', 'period_end', 'created_at', 'updated_at']:
        if isinstance(quota[key], str):
            quota[key] = datetime.fromisoformat(quota[key])
    for key in ['quota_amount', 'current_attainment', 'attainment_percent']:
        quota[key] = Decimal(quota[key])
    return quota

@api_router.patch("/quotas/{quota_id}")
async def update_quota(quota_id: str, update_data: dict, current_user: User = Depends(require_role(["admin", "manager"]))):
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.quotas.update_one({"id": quota_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Quota not found")
    await create_audit_log(current_user.id, "quota_updated", "quota", quota_id, None, update_data)
    return {"message": "Quota updated"}

@api_router.post("/quotas/bulk-import")
async def bulk_import_quotas(file: UploadFile = File(...), current_user: User = Depends(require_role(["admin", "manager"]))):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files supported")
    
    content = await file.read()
    csv_file = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(csv_file)
    
    quotas_created = 0
    for row in reader:
        try:
            quota = Quota(
                user_id=row['user_id'],
                period_start=datetime.fromisoformat(row['period_start']),
                period_end=datetime.fromisoformat(row['period_end']),
                quota_amount=Decimal(row['quota_amount']),
                quota_type=row['quota_type'],
                assignment_method=row['assignment_method']
            )
            doc = quota.model_dump()
            doc['period_start'] = doc['period_start'].isoformat()
            doc['period_end'] = doc['period_end'].isoformat()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            for key in ['quota_amount', 'current_attainment', 'attainment_percent']:
                doc[key] = str(doc[key])
            await db.quotas.insert_one(doc)
            quotas_created += 1
        except:
            pass
    
    return {"quotas_created": quotas_created}

# ============= FORECAST ENDPOINTS =============

@api_router.post("/forecasts")
async def create_forecast(forecast_data: ForecastCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    forecast = Forecast(
        **forecast_data.model_dump(),
        created_by=current_user.id,
        projected_revenue=Decimal("1000000.0000"),
        projected_payout=Decimal("50000.0000"),
        projected_cos_percent=Decimal("5.0000")
    )
    
    doc = forecast.model_dump()
    doc['period_start'] = doc['period_start'].isoformat()
    doc['period_end'] = doc['period_end'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    for key in ['projected_revenue', 'projected_payout', 'projected_cos_percent', 'variance_from_current']:
        doc[key] = str(doc[key])
    
    await db.forecasts.insert_one(doc)
    await create_audit_log(current_user.id, "forecast_created", "forecast", forecast.id, None, doc)
    return forecast

@api_router.get("/forecasts")
async def list_forecasts(current_user: User = Depends(require_role(["admin", "finance"]))):
    forecasts = await db.forecasts.find({}, {"_id": 0}).to_list(100)
    for f in forecasts:
        for key in ['period_start', 'period_end', 'created_at']:
            if isinstance(f[key], str):
                f[key] = datetime.fromisoformat(f[key])
        for key in ['projected_revenue', 'projected_payout', 'projected_cos_percent', 'variance_from_current']:
            f[key] = Decimal(f[key])
    return forecasts

@api_router.get("/forecasts/scenarios")
async def get_forecast_scenarios(current_user: User = Depends(require_role(["admin", "finance"]))):
    scenarios = await db.forecasts.find({}, {"_id": 0}).to_list(100)
    return {
        "conservative": [s for s in scenarios if 'conservative' in s.get('scenario_name', '').lower()],
        "realistic": [s for s in scenarios if 'realistic' in s.get('scenario_name', '').lower()],
        "optimistic": [s for s in scenarios if 'optimistic' in s.get('scenario_name', '').lower()]
    }

# ============= TICKET/SUPPORT ENDPOINTS =============

@api_router.post("/tickets")
async def create_ticket(ticket_data: TicketCreate, current_user: User = Depends(get_current_user)):
    sla_hours = calculate_sla_hours(ticket_data.severity)
    ticket = Ticket(**ticket_data.model_dump(), submitted_by=current_user.id, sla_hours=sla_hours)
    
    doc = ticket.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.tickets.insert_one(doc)
    await create_audit_log(current_user.id, "ticket_created", "ticket", ticket.id, None, doc)
    return ticket

@api_router.get("/tickets")
async def list_tickets(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role not in ["admin", "finance"]:
        query["submitted_by"] = current_user.id
    
    tickets = await db.tickets.find(query, {"_id": 0}).to_list(100)
    for t in tickets:
        t['created_at'] = datetime.fromisoformat(t['created_at'])
        if t.get('resolved_at') and isinstance(t['resolved_at'], str):
            t['resolved_at'] = datetime.fromisoformat(t['resolved_at'])
        t['sla_breach'] = check_sla_breach(t['created_at'], t['sla_hours'])
    return tickets

@api_router.get("/tickets/my-tickets")
async def get_my_tickets(current_user: User = Depends(get_current_user)):
    tickets = await db.tickets.find({"submitted_by": current_user.id}, {"_id": 0}).to_list(100)
    for t in tickets:
        t['created_at'] = datetime.fromisoformat(t['created_at'])
        if t.get('resolved_at') and isinstance(t['resolved_at'], str):
            t['resolved_at'] = datetime.fromisoformat(t['resolved_at'])
        t['sla_breach'] = check_sla_breach(t['created_at'], t['sla_hours'])
    return tickets

@api_router.patch("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    result = await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await create_audit_log(current_user.id, "ticket_updated", "ticket", ticket_id, None, update_data)
    return {"message": "Ticket updated"}

@api_router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, assignment_data: dict, current_user: User = Depends(require_role(["admin", "manager"]))):
    assigned_to = assignment_data.get('assigned_to')
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"assigned_to": assigned_to, "status": "assigned"}}
    )
    await create_audit_log(current_user.id, "ticket_assigned", "ticket", ticket_id, None, {"assigned_to": assigned_to})
    return {"message": "Ticket assigned"}

@api_router.post("/tickets/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: str, resolution_data: dict, current_user: User = Depends(get_current_user)):
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )
    await create_audit_log(current_user.id, "ticket_resolved", "ticket", ticket_id, None, resolution_data)
    return {"message": "Ticket resolved"}

@api_router.post("/tickets/{ticket_id}/comment")
async def add_ticket_comment(ticket_id: str, comment_data: dict, current_user: User = Depends(get_current_user)):
    comment = {
        "user_id": current_user.id,
        "user_name": current_user.full_name,
        "comment": comment_data.get('comment'),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"comments": comment}}
    )
    return {"message": "Comment added"}

# ============= NFM (NON-FINANCIAL METRICS) ENDPOINTS =============

@api_router.post("/nfms")
async def create_nfm(nfm_data: NFMCreate, current_user: User = Depends(require_role(["admin", "manager"]))):
    nfm = NFM(**nfm_data.model_dump())
    doc = nfm.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    for key in ['target_value', 'actual_value']:
        doc[key] = str(doc[key])
    if doc.get('multiplier_effect'):
        doc['multiplier_effect'] = str(doc['multiplier_effect'])
    if doc.get('threshold_requirement'):
        doc['threshold_requirement'] = str(doc['threshold_requirement'])
    
    await db.nfms.insert_one(doc)
    await create_audit_log(current_user.id, "nfm_created", "nfm", nfm.id, None, doc)
    return nfm

@api_router.get("/nfms")
async def list_nfms(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role in ["rep", "partner"]:
        query["user_id"] = current_user.id
    
    nfms = await db.nfms.find(query, {"_id": 0}).to_list(100)
    for n in nfms:
        if isinstance(n['created_at'], str):
            n['created_at'] = datetime.fromisoformat(n['created_at'])
        for key in ['target_value', 'actual_value']:
            n[key] = Decimal(n[key])
        if n.get('multiplier_effect'):
            n['multiplier_effect'] = Decimal(n['multiplier_effect'])
        if n.get('threshold_requirement'):
            n['threshold_requirement'] = Decimal(n['threshold_requirement'])
    return nfms

@api_router.patch("/nfms/{nfm_id}")
async def update_nfm(nfm_id: str, update_data: dict, current_user: User = Depends(require_role(["admin", "manager"]))):
    result = await db.nfms.update_one({"id": nfm_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="NFM not found")
    await create_audit_log(current_user.id, "nfm_updated", "nfm", nfm_id, None, update_data)
    return {"message": "NFM updated"}

# ============= ANALYTICS & DASHBOARD ENDPOINTS =============

@api_router.get("/analytics/dashboard")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get user-specific stats
    total_earnings = Decimal("0")
    calculations = await db.commission_calculations.find({"sales_rep_id": current_user.id}, {"_id": 0}).to_list(1000)
    if calculations:
        total_earnings = sum(Decimal(c['final_amount']) for c in calculations)
    
    # Get quota attainment
    quota = await db.quotas.find_one({"user_id": current_user.id, "status": "active"}, {"_id": 0})
    quota_attainment = Decimal("0")
    if quota:
        quota_attainment = Decimal(quota['attainment_percent'])
    
    # Get active spiffs
    now = datetime.now(timezone.utc).isoformat()
    active_spiffs_count = await db.spiffs.count_documents({
        "status": "active",
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    })
    
    # Get pending approvals count
    pending_approvals = 0
    if current_user.role in ["admin", "finance", "manager"]:
        pending_approvals = await db.approval_workflows.count_documents({
            "steps": {
                "$elemMatch": {
                    "approver_id": current_user.id,
                    "status": "pending"
                }
            }
        })
    
    # Get open tickets
    open_tickets = await db.tickets.count_documents({
        "submitted_by": current_user.id,
        "status": {"$in": ["new", "assigned", "investigating"]}
    })
    
    return {
        "total_earnings": str(total_earnings),
        "quota_attainment": str(quota_attainment),
        "active_spiffs": active_spiffs_count,
        "pending_approvals": pending_approvals,
        "open_tickets": open_tickets,
        "recent_calculations": calculations[:10] if calculations else []
    }

@api_router.get("/analytics/team-performance")
async def get_team_performance(current_user: User = Depends(require_role(["admin", "manager", "finance"]))):
    # Get all users and their performance
    users = await db.users.find({"role": {"$in": ["rep", "partner"]}}, {"_id": 0}).to_list(100)
    
    performance_data = []
    for user in users:
        calculations = await db.commission_calculations.find({"sales_rep_id": user['id']}, {"_id": 0}).to_list(1000)
        total = sum(Decimal(c['final_amount']) for c in calculations) if calculations else Decimal("0")
        
        quota = await db.quotas.find_one({"user_id": user['id'], "status": "active"}, {"_id": 0})
        attainment = Decimal(quota['attainment_percent']) if quota else Decimal("0")
        
        performance_data.append({
            "user_id": user['id'],
            "user_name": user['full_name'],
            "total_earnings": str(total),
            "quota_attainment": str(attainment),
            "rank": 0
        })
    
    # Sort by earnings and assign ranks
    performance_data.sort(key=lambda x: Decimal(x['total_earnings']), reverse=True)
    for idx, item in enumerate(performance_data):
        item['rank'] = idx + 1
    
    return performance_data

@api_router.get("/analytics/channel-health")
async def get_channel_health(current_user: User = Depends(require_role(["admin", "finance"]))):
    # Get partner health metrics
    partners = await db.partners.find({"status": "active"}, {"_id": 0}).to_list(100)
    
    health_data = []
    for partner in partners:
        # Get partner transactions
        transactions = await db.transactions.find({"sales_rep_id": partner.get('user_id', '')}, {"_id": 0}).to_list(1000)
        total_volume = sum(Decimal(t['total_amount']) for t in transactions) if transactions else Decimal("0")
        
        # Get NFM compliance
        nfms = await db.nfms.find({"user_id": partner.get('user_id', '')}, {"_id": 0}).to_list(100)
        nfm_compliance = Decimal("100") if nfms else Decimal("0")
        
        health_data.append({
            "partner_id": partner['id'],
            "partner_name": partner['company_name'],
            "tier": partner['tier'],
            "total_volume": str(total_volume),
            "nfm_compliance": str(nfm_compliance),
            "status": partner['status']
        })
    
    return health_data

@api_router.get("/analytics/reports")
async def generate_report(report_type: str, current_user: User = Depends(require_role(["admin", "finance"]))):
    if report_type == "commission_summary":
        calculations = await db.commission_calculations.find({}, {"_id": 0}).to_list(1000)
        return {"report_type": "commission_summary", "data": calculations}
    
    elif report_type == "payout_reconciliation":
        payouts = await db.payouts.find({}, {"_id": 0}).to_list(1000)
        return {"report_type": "payout_reconciliation", "data": payouts}
    
    elif report_type == "partner_profitability":
        partners = await db.partners.find({}, {"_id": 0}).to_list(100)
        return {"report_type": "partner_profitability", "data": partners}
    
    return {"message": "Report type not found"}

@api_router.post("/analytics/export")
async def export_analytics(export_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    format_type = export_data.get('format', 'pdf')
    report_type = export_data.get('report_type', 'commission_summary')
    
    return {
        "message": f"Export generated in {format_type} format",
        "report_type": report_type,
        "file_path": f"/exports/{report_type}_{datetime.now().strftime('%Y%m%d')}.{format_type}"
    }

# ============= GAMIFICATION ENDPOINTS =============

@api_router.get("/gamification/leaderboard")
async def get_leaderboard(period: str = "monthly", current_user: User = Depends(get_current_user)):
    # Get all reps and their earnings
    users = await db.users.find({"role": {"$in": ["rep", "partner"]}}, {"_id": 0}).to_list(100)
    
    leaderboard = []
    for user in users:
        calculations = await db.commission_calculations.find({"sales_rep_id": user['id']}, {"_id": 0}).to_list(1000)
        total = sum(Decimal(c['final_amount']) for c in calculations) if calculations else Decimal("0")
        
        leaderboard.append({
            "user_id": user['id'],
            "user_name": user['full_name'],
            "total_earnings": str(total),
            "badge": "Gold" if total > Decimal("10000") else "Silver" if total > Decimal("5000") else "Bronze"
        })
    
    leaderboard.sort(key=lambda x: Decimal(x['total_earnings']), reverse=True)
    for idx, item in enumerate(leaderboard):
        item['rank'] = idx + 1
    
    return leaderboard

@api_router.get("/gamification/milestones")
async def get_milestones(current_user: User = Depends(get_current_user)):
    calculations = await db.commission_calculations.find({"sales_rep_id": current_user.id}, {"_id": 0}).to_list(1000)
    total_earnings = sum(Decimal(c['final_amount']) for c in calculations) if calculations else Decimal("0")
    
    milestones = [
        {"name": "First Commission", "threshold": "100", "achieved": total_earnings >= Decimal("100")},
        {"name": "Rising Star", "threshold": "1000", "achieved": total_earnings >= Decimal("1000")},
        {"name": "Top Performer", "threshold": "5000", "achieved": total_earnings >= Decimal("5000")},
        {"name": "Elite Seller", "threshold": "10000", "achieved": total_earnings >= Decimal("10000")},
        {"name": "Legend", "threshold": "25000", "achieved": total_earnings >= Decimal("25000")}
    ]
    
    return {"milestones": milestones, "total_earnings": str(total_earnings)}

# ============= ELIGIBILITY MATRIX ENDPOINTS =============

@api_router.post("/eligibility-rules")
async def create_eligibility_rule(rule_data: EligibilityRuleCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    rule = EligibilityRule(**rule_data.model_dump())
    doc = rule.model_dump()
    doc['effective_start'] = doc['effective_start'].isoformat()
    if doc['effective_end']:
        doc['effective_end'] = doc['effective_end'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('commission_rate_override'):
        doc['commission_rate_override'] = str(doc['commission_rate_override'])
    
    await db.eligibility_rules.insert_one(doc)
    await create_audit_log(current_user.id, "eligibility_rule_created", "eligibility_rule", rule.id, None, doc)
    return rule

@api_router.get("/eligibility-rules")
async def list_eligibility_rules(current_user: User = Depends(require_role(["admin", "finance"]))):
    rules = await db.eligibility_rules.find({}, {"_id": 0}).to_list(100)
    for r in rules:
        r['effective_start'] = datetime.fromisoformat(r['effective_start'])
        if r.get('effective_end') and isinstance(r['effective_end'], str):
            r['effective_end'] = datetime.fromisoformat(r['effective_end'])
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if r.get('commission_rate_override'):
            r['commission_rate_override'] = Decimal(r['commission_rate_override'])
    return rules

# ============= DATA SOURCE MAPPING ENDPOINTS =============

@api_router.post("/data-sources")
async def create_data_source(source_data: DataSourceMappingCreate, current_user: User = Depends(require_role(["admin"]))):
    source = DataSourceMapping(**source_data.model_dump())
    doc = source.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.data_source_mappings.insert_one(doc)
    await create_audit_log(current_user.id, "data_source_created", "data_source", source.id, None, doc)
    return source

@api_router.get("/data-sources")
async def list_data_sources(current_user: User = Depends(require_role(["admin"]))):
    sources = await db.data_source_mappings.find({}, {"_id": 0}).to_list(100)
    for s in sources:
        if isinstance(s['created_at'], str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
        if s.get('last_sync') and isinstance(s['last_sync'], str):
            s['last_sync'] = datetime.fromisoformat(s['last_sync'])
    return sources

# ============= CUSTOM ROLE ENDPOINTS =============

@api_router.post("/roles/custom")
async def create_custom_role(role_data: CustomRoleCreate, current_user: User = Depends(require_role(["admin"]))):
    role = CustomRole(**role_data.model_dump(), created_by=current_user.id)
    doc = role.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.custom_roles.insert_one(doc)
    await create_audit_log(current_user.id, "custom_role_created", "custom_role", role.id, None, doc)
    return role

@api_router.get("/roles/custom")
async def list_custom_roles(current_user: User = Depends(require_role(["admin"]))):
    roles = await db.custom_roles.find({}, {"_id": 0}).to_list(100)
    for r in roles:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if isinstance(r['updated_at'], str):
            r['updated_at'] = datetime.fromisoformat(r['updated_at'])
    return roles

@api_router.get("/roles/custom/{role_id}")
async def get_custom_role(role_id: str, current_user: User = Depends(require_role(["admin"]))):
    role = await db.custom_roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if isinstance(role['created_at'], str):
        role['created_at'] = datetime.fromisoformat(role['created_at'])
    if isinstance(role['updated_at'], str):
        role['updated_at'] = datetime.fromisoformat(role['updated_at'])
    return role

@api_router.patch("/roles/custom/{role_id}")
async def update_custom_role(role_id: str, update_data: dict, current_user: User = Depends(require_role(["admin"]))):
    role = await db.custom_roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.custom_roles.update_one({"id": role_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "custom_role_updated", "custom_role", role_id, role, update_data)
    return {"message": "Custom role updated successfully"}

@api_router.delete("/roles/custom/{role_id}")
async def delete_custom_role(role_id: str, current_user: User = Depends(require_role(["admin"]))):
    result = await db.custom_roles.delete_one({"id": role_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    await create_audit_log(current_user.id, "custom_role_deleted", "custom_role", role_id, None, None)
    return {"message": "Custom role deleted successfully"}

# ============= CUSTOM GROUP ENDPOINTS =============

@api_router.post("/groups/custom")
async def create_custom_group(group_data: CustomGroupCreate, current_user: User = Depends(require_role(["admin"]))):
    group = CustomGroup(**group_data.model_dump(), created_by=current_user.id)
    doc = group.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.custom_groups.insert_one(doc)
    await create_audit_log(current_user.id, "custom_group_created", "custom_group", group.id, None, doc)
    return group

@api_router.get("/groups/custom")
async def list_custom_groups(current_user: User = Depends(require_role(["admin"]))):
    groups = await db.custom_groups.find({}, {"_id": 0}).to_list(100)
    for g in groups:
        if isinstance(g['created_at'], str):
            g['created_at'] = datetime.fromisoformat(g['created_at'])
        if isinstance(g['updated_at'], str):
            g['updated_at'] = datetime.fromisoformat(g['updated_at'])
    return groups

@api_router.get("/groups/custom/{group_id}")
async def get_custom_group(group_id: str, current_user: User = Depends(require_role(["admin"]))):
    group = await db.custom_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if isinstance(group['created_at'], str):
        group['created_at'] = datetime.fromisoformat(group['created_at'])
    if isinstance(group['updated_at'], str):
        group['updated_at'] = datetime.fromisoformat(group['updated_at'])
    return group

@api_router.patch("/groups/custom/{group_id}")
async def update_custom_group(group_id: str, update_data: dict, current_user: User = Depends(require_role(["admin"]))):
    group = await db.custom_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.custom_groups.update_one({"id": group_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "custom_group_updated", "custom_group", group_id, group, update_data)
    return {"message": "Custom group updated successfully"}

@api_router.delete("/groups/custom/{group_id}")
async def delete_custom_group(group_id: str, current_user: User = Depends(require_role(["admin"]))):
    result = await db.custom_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    await create_audit_log(current_user.id, "custom_group_deleted", "custom_group", group_id, None, None)
    return {"message": "Custom group deleted successfully"}

@api_router.get("/permissions/available")
async def get_available_permissions(current_user: User = Depends(require_role(["admin"]))):
    # Get all available permissions in the system
    permissions = {
        "user_management": [
            {"key": "users.view", "label": "View Users", "description": "View list of all users"},
            {"key": "users.create", "label": "Create Users", "description": "Create new internal users"},
            {"key": "users.edit", "label": "Edit Users", "description": "Modify user information"},
            {"key": "users.delete", "label": "Delete Users", "description": "Delete user accounts"},
            {"key": "users.change_role", "label": "Change User Roles", "description": "Modify user roles"},
            {"key": "users.activate_deactivate", "label": "Activate/Deactivate Users", "description": "Toggle user active status"}
        ],
        "partner_management": [
            {"key": "partners.view_all", "label": "View All Partners", "description": "View all partner accounts"},
            {"key": "partners.view_own", "label": "View Own Partner Data", "description": "View own partner information"},
            {"key": "partners.create", "label": "Register Partners", "description": "Create new partner accounts"},
            {"key": "partners.edit", "label": "Edit Partners", "description": "Modify partner information"},
            {"key": "partners.approve", "label": "Approve Partners", "description": "Approve partner applications"},
            {"key": "partners.reject", "label": "Reject Partners", "description": "Reject partner applications"},
            {"key": "partners.assign_tier", "label": "Assign Partner Tiers", "description": "Change partner tier levels"},
            {"key": "partners.deactivate", "label": "Deactivate Partners", "description": "Deactivate partner accounts"}
        ],
        "product_management": [
            {"key": "products.view", "label": "View Products", "description": "View product catalog"},
            {"key": "products.create", "label": "Create Products", "description": "Add new products"},
            {"key": "products.edit", "label": "Edit Products", "description": "Modify product information"},
            {"key": "products.delete", "label": "Delete Products", "description": "Remove products"},
            {"key": "products.bulk_upload", "label": "Bulk Upload Products", "description": "Upload products via CSV"}
        ],
        "transaction_management": [
            {"key": "transactions.view_all", "label": "View All Transactions", "description": "View all transactions"},
            {"key": "transactions.view_own", "label": "View Own Transactions", "description": "View own transactions only"},
            {"key": "transactions.create", "label": "Create Transactions", "description": "Create new transactions"}
        ],
        "commission_management": [
            {"key": "commissions.view_all", "label": "View All Commissions", "description": "View all commission calculations"},
            {"key": "commissions.view_own", "label": "View Own Commissions", "description": "View own earnings only"},
            {"key": "plans.view", "label": "View Commission Plans", "description": "View commission plans"},
            {"key": "plans.create", "label": "Create Commission Plans", "description": "Create new commission plans"},
            {"key": "plans.edit", "label": "Edit Commission Plans", "description": "Modify commission plans"},
            {"key": "plans.delete", "label": "Delete Commission Plans", "description": "Remove commission plans"}
        ],
        "spiff_management": [
            {"key": "spiffs.view", "label": "View Spiffs", "description": "View spiff campaigns"},
            {"key": "spiffs.create", "label": "Create Spiffs", "description": "Create spiff campaigns"},
            {"key": "spiffs.edit", "label": "Edit Spiffs", "description": "Modify spiff campaigns"},
            {"key": "spiffs.activate", "label": "Activate/Deactivate Spiffs", "description": "Change spiff status"}
        ],
        "approval_workflows": [
            {"key": "approvals.view_all", "label": "View All Approvals", "description": "View all approval workflows"},
            {"key": "approvals.view_assigned", "label": "View Assigned Approvals", "description": "View approvals assigned to me"},
            {"key": "approvals.create", "label": "Create Workflows", "description": "Create approval workflows"},
            {"key": "approvals.approve", "label": "Approve", "description": "Approve workflow steps"},
            {"key": "approvals.reject", "label": "Reject", "description": "Reject workflows"}
        ],
        "payout_management": [
            {"key": "payouts.view_all", "label": "View All Payouts", "description": "View all payouts"},
            {"key": "payouts.view_own", "label": "View Own Payouts", "description": "View own payouts only"},
            {"key": "payouts.create", "label": "Create Payouts", "description": "Create new payouts"},
            {"key": "payouts.approve", "label": "Approve Payouts", "description": "Approve payout processing"},
            {"key": "payouts.export", "label": "Export Payouts", "description": "Export payout data"}
        ],
        "territory_management": [
            {"key": "territories.view", "label": "View Territories", "description": "View all territories"},
            {"key": "territories.create", "label": "Create Territories", "description": "Create new territories"},
            {"key": "territories.edit", "label": "Edit Territories", "description": "Modify territories"},
            {"key": "territories.assign", "label": "Assign Territories", "description": "Assign territories to reps"}
        ],
        "quota_management": [
            {"key": "quotas.view_all", "label": "View All Quotas", "description": "View all quotas"},
            {"key": "quotas.view_own", "label": "View Own Quota", "description": "View own quota only"},
            {"key": "quotas.create", "label": "Create Quotas", "description": "Create new quotas"},
            {"key": "quotas.edit", "label": "Edit Quotas", "description": "Modify quotas"},
            {"key": "quotas.bulk_import", "label": "Bulk Import Quotas", "description": "Import quotas via CSV"}
        ],
        "forecasting": [
            {"key": "forecasts.view", "label": "View Forecasts", "description": "View forecast scenarios"},
            {"key": "forecasts.create", "label": "Create Forecasts", "description": "Create forecast scenarios"},
            {"key": "forecasts.scenarios", "label": "View Scenarios", "description": "View scenario comparisons"}
        ],
        "ticket_management": [
            {"key": "tickets.view_all", "label": "View All Tickets", "description": "View all support tickets"},
            {"key": "tickets.view_own", "label": "View Own Tickets", "description": "View own tickets only"},
            {"key": "tickets.create", "label": "Create Tickets", "description": "Create support tickets"},
            {"key": "tickets.edit", "label": "Edit Tickets", "description": "Update ticket information"},
            {"key": "tickets.assign", "label": "Assign Tickets", "description": "Assign tickets to users"},
            {"key": "tickets.resolve", "label": "Resolve Tickets", "description": "Mark tickets as resolved"}
        ],
        "nfm_management": [
            {"key": "nfms.view", "label": "View NFMs", "description": "View non-financial metrics"},
            {"key": "nfms.create", "label": "Create NFMs", "description": "Create NFM tracking"},
            {"key": "nfms.edit", "label": "Edit NFMs", "description": "Modify NFM data"}
        ],
        "analytics_reporting": [
            {"key": "analytics.dashboard", "label": "View Dashboard", "description": "Access main dashboard"},
            {"key": "analytics.team_performance", "label": "View Team Performance", "description": "View team analytics"},
            {"key": "analytics.channel_health", "label": "View Channel Health", "description": "View partner channel metrics"},
            {"key": "analytics.reports", "label": "Generate Reports", "description": "Generate custom reports"},
            {"key": "analytics.export", "label": "Export Data", "description": "Export analytics data"}
        ],
        "eligibility_rules": [
            {"key": "eligibility.view", "label": "View Eligibility Rules", "description": "View eligibility matrix"},
            {"key": "eligibility.create", "label": "Create Rules", "description": "Create eligibility rules"},
            {"key": "eligibility.edit", "label": "Edit Rules", "description": "Modify eligibility rules"}
        ],
        "role_group_management": [
            {"key": "roles.view", "label": "View Roles", "description": "View role definitions"},
            {"key": "roles.create_custom", "label": "Create Custom Roles", "description": "Create custom roles"},
            {"key": "roles.edit_custom", "label": "Edit Custom Roles", "description": "Modify custom roles"},
            {"key": "roles.delete_custom", "label": "Delete Custom Roles", "description": "Remove custom roles"},
            {"key": "groups.view", "label": "View Groups", "description": "View user groups"},
            {"key": "groups.create_custom", "label": "Create Custom Groups", "description": "Create custom groups"},
            {"key": "groups.edit_custom", "label": "Edit Custom Groups", "description": "Modify custom groups"},
            {"key": "groups.delete_custom", "label": "Delete Custom Groups", "description": "Remove custom groups"}
        ]
    }
    return permissions

# Include specialized routes FIRST (takes precedence over old routes in api_router)
from partner_hub_routes import partner_router
from product_routes import product_router
from spiff_routes import spiff_router
from sales_commission_routes import sales_router
from access_control_routes import access_control_router
from fulfillment_routes import fulfillment_router

app.include_router(partner_router)
app.include_router(product_router, prefix="/api")
app.include_router(spiff_router, prefix="/api")
app.include_router(sales_router, prefix="/api")
app.include_router(access_control_router)
app.include_router(fulfillment_router)

# Include the main routers
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
