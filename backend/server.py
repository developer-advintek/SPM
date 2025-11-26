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
import socketio
import json
from decimal import Decimal
import csv
import io

# Import models and utilities
from models import *
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
        self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            await self.user_connections[user_id].send_text(json.dumps(message))

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_text(json.dumps(message))

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

# ============= AUTHENTICATION ENDPOINTS =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    if user_data.password:
        user_dict['password'] = get_password_hash(user_data.password)
    
    user_obj = User(**{k: v for k, v in user_dict.items() if k != 'password' and k != 'google_id'})
    doc = user_obj.model_dump()
    for key in ['created_at', 'updated_at']:
        if key in doc and isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat()
    
    doc['password'] = user_dict.get('password')
    doc['google_id'] = user_dict.get('google_id')
    
    await db.users.insert_one(doc)
    
    # Create audit log
    await create_audit_log(user_obj.id, "user_registration", "user", user_obj.id, None, doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user_obj.id, "role": user_obj.role})
    
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get('password', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Convert ISO strings back to datetime
    for key in ['created_at', 'updated_at']:
        if key in user and isinstance(user[key], str):
            user[key] = datetime.fromisoformat(user[key])
    
    user_obj = User(**{k: v for k, v in user.items() if k not in ['password', 'google_id']})
    
    access_token = create_access_token(data={"sub": user_obj.id, "role": user_obj.role})
    
    await create_audit_log(user_obj.id, "user_login", "user", user_obj.id, None, None)
    
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/google")
async def google_login(token: dict):
    # Mock Google OAuth - In production, verify token with Google
    google_id = token.get('google_id')
    email = token.get('email')
    name = token.get('name')
    
    # Find or create user
    user = await db.users.find_one({"$or": [{"google_id": google_id}, {"email": email}]}, {"_id": 0})
    
    if not user:
        # Create new user
        user_create = UserCreate(
            email=email,
            full_name=name,
            role="rep",  # Default role
            google_id=google_id
        )
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
    # Only allow updating specific fields
    allowed_fields = ['active', 'role', 'territory_id', 'manager_id', 'full_name']
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await create_audit_log(current_user.id, "user_updated", "user", user_id, None, update_dict)
    
    return {"message": "User updated successfully"}

# ============= PARTNER REGISTRATION ENDPOINTS =============

@api_router.post("/partners/register")
async def register_partner(partner_data: dict):
    """Public endpoint for partner self-registration with documents"""
    # Create partner profile with pending_review status
    partner = Partner(
        company_name=partner_data.get('company_name'),
        contact_name=partner_data.get('contact_name'),
        contact_email=partner_data.get('contact_email'),
        user_id=partner_data.get('user_id'),
        tier='bronze',
        status='pending_review',  # Requires admin approval
        onboarding_progress=50
    )
    
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    # Store additional registration data
    doc['phone'] = partner_data.get('phone')
    doc['website'] = partner_data.get('website')
    doc['business_type'] = partner_data.get('business_type')
    doc['years_in_business'] = partner_data.get('years_in_business')
    doc['number_of_employees'] = partner_data.get('number_of_employees')
    doc['expected_monthly_volume'] = partner_data.get('expected_monthly_volume')
    
    # Store document information (in production, upload to cloud storage)
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
    
    # Deactivate user until approved
    await db.users.update_one(
        {"id": partner.user_id},
        {"$set": {"active": False}}
    )
    
    # Create audit log
    await create_audit_log(partner.user_id, "partner_registered", "partner", partner.id, None, doc)
    
    # TODO: Send notification to admins about new partner registration
    
    return {"message": "Partner registered successfully. Pending admin approval.", "partner_id": partner.id}

@api_router.get("/partners/all")
async def get_all_partners(current_user: User = Depends(get_current_user)):
    """Get all partners - admins see all, partners see only their own"""
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
    """Get all partners for review"""
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
    """Approve partner application"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update partner status
    update_data = {
        "status": "approved",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_by": current_user.id,
        "onboarding_progress": 100,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to review history
    review_history = partner.get('review_history', [])
    review_history.append({
        "action": "approved",
        "comments": review_data.get('comments', ''),
        "reviewer": current_user.full_name,
        "date": datetime.now(timezone.utc).isoformat()
    })
    update_data['review_history'] = review_history
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    
    # Activate user account
    await db.users.update_one(
        {"id": partner['user_id']},
        {"$set": {"active": True}}
    )
    
    # Create audit log
    await create_audit_log(current_user.id, "partner_approved", "partner", partner_id, partner, update_data)
    
    # TODO: Send approval email to partner
    
    return {"message": "Partner approved successfully"}

@api_router.post("/partners/{partner_id}/reject")
async def reject_partner(partner_id: str, review_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Reject partner application"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update partner status
    update_data = {
        "status": "rejected",
        "rejection_reason": review_data.get('reason', 'Application did not meet requirements'),
        "rejected_at": datetime.now(timezone.utc).isoformat(),
        "rejected_by": current_user.id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to review history
    review_history = partner.get('review_history', [])
    review_history.append({
        "action": "rejected",
        "comments": review_data.get('reason', ''),
        "reviewer": current_user.full_name,
        "date": datetime.now(timezone.utc).isoformat()
    })
    update_data['review_history'] = review_history
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    
    # Create audit log
    await create_audit_log(current_user.id, "partner_rejected", "partner", partner_id, partner, update_data)
    
    # TODO: Send rejection email to partner
    
    return {"message": "Partner rejected"}

@api_router.post("/partners/{partner_id}/request-more")
async def request_more_info(partner_id: str, review_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Request additional information from partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Update partner status
    update_data = {
        "status": "more_info_needed",
        "info_request": review_data.get('message', ''),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to review history
    review_history = partner.get('review_history', [])
    review_history.append({
        "action": "requested_more_info",
        "comments": review_data.get('message', ''),
        "reviewer": current_user.full_name,
        "date": datetime.now(timezone.utc).isoformat()
    })
    update_data['review_history'] = review_history
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    
    # Create audit log
    await create_audit_log(current_user.id, "partner_info_requested", "partner", partner_id, partner, update_data)
    
    # TODO: Send email to partner requesting more info
    
    return {"message": "Information request sent to partner"}

@api_router.patch("/partners/{partner_id}")
async def update_partner(partner_id: str, update_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Update partner details (tier, status, notes)"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    allowed_fields = ['tier', 'status', 'notes']
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_dict})
    
    # Create audit log
    await create_audit_log(current_user.id, "partner_updated", "partner", partner_id, partner, update_dict)
    
    return {"message": "Partner updated successfully"}

@api_router.post("/partners/{partner_id}/deactivate")
async def deactivate_partner(partner_id: str, deactivate_data: dict, current_user: User = Depends(require_role(["admin", "finance"]))):
    """Deactivate a partner"""
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
    
    # Deactivate user account
    await db.users.update_one(
        {"id": partner['user_id']},
        {"$set": {"active": False}}
    )
    
    # Create audit log
    await create_audit_log(current_user.id, "partner_deactivated", "partner", partner_id, partner, update_data)
    
    # TODO: Send deactivation email
    
    return {"message": "Partner deactivated successfully"}

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

# ============= PRODUCT ENDPOINTS =============

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    # Validate commission rate and margin
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

# ============= TRANSACTION ENDPOINTS =============

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(txn_data: TransactionCreate, current_user: User = Depends(require_role(["admin", "manager"]))):
    txn_data_dict = txn_data.model_dump()
    txn_data_dict['total_amount'] = validate_financial_precision(txn_data.unit_price * txn_data.quantity)
    
    transaction = Transaction(**txn_data_dict)
    doc = transaction.model_dump()
    doc['transaction_date'] = doc['transaction_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    for key in ['unit_price', 'total_amount']:
        doc[key] = str(doc[key])
    
    await db.transactions.insert_one(doc)
    
    # Trigger real-time calculation
    await process_transaction_commission(transaction.id)
    
    # Broadcast update via WebSocket
    await manager.broadcast({"type": "transaction_created", "transaction_id": transaction.id})
    
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(current_user: User = Depends(get_current_user), limit: int = 100):
    query = {}
    if current_user.role == "partner":
        # Partners can only see their own transactions
        query["sales_rep_id"] = current_user.id
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for t in transactions:
        for key in ['transaction_date', 'created_at']:
            if key in t and isinstance(t[key], str):
                t[key] = datetime.fromisoformat(t[key])
        if 'processed_at' in t and t['processed_at'] and isinstance(t['processed_at'], str):
            t['processed_at'] = datetime.fromisoformat(t['processed_at'])
        for key in ['unit_price', 'total_amount']:
            t[key] = Decimal(t[key])
    return transactions

# ============= COMMISSION CALCULATION =============

async def process_transaction_commission(transaction_id: str):
    """Process commission calculation for a transaction."""
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        return
    
    # Get active commission plan for the rep
    plan = await db.commission_plans.find_one(
        {"plan_type": "individual", "status": "active"},
        {"_id": 0}
    )
    
    if not plan:
        # No active plan, skip
        return
    
    # Calculate base commission (simplified)
    total_amount = Decimal(transaction['total_amount'])
    base_rate = Decimal('0.05')  # 5% default
    commission_amount = validate_financial_precision(total_amount * base_rate)
    
    # Create calculation record
    calculation = CommissionCalculation(
        transaction_id=transaction_id,
        sales_rep_id=transaction['sales_rep_id'],
        plan_id=plan['id'],
        base_amount=total_amount,
        commission_amount=commission_amount,
        final_amount=commission_amount
    )
    
    doc = calculation.model_dump()
    doc['calculation_date'] = doc['calculation_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    for key in ['base_amount', 'commission_amount', 'adjustments', 'final_amount', 'holdback_amount']:
        doc[key] = str(doc[key])
    
    await db.commission_calculations.insert_one(doc)
    
    # Update transaction status
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": "processed", "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send real-time update to user
    await manager.send_personal_message(
        {"type": "commission_calculated", "transaction_id": transaction_id, "amount": str(commission_amount)},
        transaction['sales_rep_id']
    )

@api_router.get("/commissions/my-earnings")
async def get_my_earnings(current_user: User = Depends(get_current_user)):
    """Get earnings for current user."""
    calculations = await db.commission_calculations.find(
        {"sales_rep_id": current_user.id},
        {"_id": 0}
    ).to_list(1000)
    
    for c in calculations:
        for key in ['calculation_date', 'created_at']:
            if isinstance(c[key], str):
                c[key] = datetime.fromisoformat(c[key])
        for key in ['base_amount', 'commission_amount', 'adjustments', 'final_amount', 'holdback_amount']:
            c[key] = Decimal(c[key])
    
    total_earnings = sum(Decimal(c['final_amount']) for c in calculations)
    
    return {"total_earnings": str(total_earnings), "calculations": calculations}

# ============= COMMISSION PLAN ENDPOINTS =============

@api_router.post("/plans", response_model=CommissionPlan)
async def create_commission_plan(plan_data: CommissionPlanCreate, current_user: User = Depends(require_role(["admin", "finance"]))):
    # Validate plan logic
    validation = validate_commission_plan_logic(plan_data.rules)
    if not validation['valid']:
        raise HTTPException(status_code=400, detail=validation.get('error', 'Invalid plan logic'))
    
    plan = CommissionPlan(**plan_data.model_dump(), created_by=current_user.id)
    doc = plan.model_dump()
    doc['effective_start'] = doc['effective_start'].isoformat()
    if doc['effective_end']:
        doc['effective_end'] = doc['effective_end'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.commission_plans.insert_one(doc)
    await create_audit_log(current_user.id, "plan_created", "commission_plan", plan.id, None, doc)
    
    return plan

@api_router.get("/plans", response_model=List[CommissionPlan])
async def list_commission_plans(current_user: User = Depends(require_role(["admin", "finance", "manager"]))):
    plans = await db.commission_plans.find({}, {"_id": 0}).to_list(100)
    for p in plans:
        p['effective_start'] = datetime.fromisoformat(p['effective_start'])
        if p.get('effective_end'):
            p['effective_end'] = datetime.fromisoformat(p['effective_end'])
        p['created_at'] = datetime.fromisoformat(p['created_at'])
        p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    return plans

# Continue in next part...

# Include the main API router
app.include_router(api_router)

# Include new modular routers
from routers import transactions, spiffs, payouts, strategic, accounting

app.include_router(transactions.router)
app.include_router(spiffs.router)
app.include_router(payouts.router)
app.include_router(strategic.router)
app.include_router(accounting.router)

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
            # Echo back or process
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
