"""
Comprehensive Partner Hub Routes
Handles partner onboarding, approval workflows, product assignment, and commission management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
from models import (
    Partner, PartnerCreate, PartnerDocument, PartnerApprovalStep, 
    PartnerNote, ContactPerson, ProductCommission, User
)
from utils.security import get_password_hash as hash_password
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

partner_router = APIRouter(prefix="/api/partners", tags=["partners"])

# Import from utils
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.security import verify_token

security = HTTPBearer()

# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    # Convert datetime fields
    for key in ['created_at', 'updated_at']:
        if key in user and isinstance(user[key], str):
            user[key] = datetime.fromisoformat(user[key])
    
    return User(**{k: v for k, v in user.items() if k not in ['password', 'google_id']})

# Helper function for audit logs
async def create_audit_log(user_id: str, action_type: str, resource_type: str, resource_id: str, state_before: Optional[dict], state_after: Optional[dict]):
    from models import AuditLog
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

# ============= HELPER FUNCTIONS =============

def can_manage_partners(user: User) -> bool:
    """Check if user can manage partners (admin or partner_manager)"""
    return user.role in ["admin", "partner_manager"]

def can_approve_l1(user: User) -> bool:
    """Check if user can approve L1"""
    return user.role in ["admin", "l1_approver"]

def can_approve_l2(user: User) -> bool:
    """Check if user can approve L2"""
    return user.role in ["admin", "l2_approver"]

async def calculate_onboarding_progress(partner: dict) -> int:
    """Calculate onboarding progress percentage"""
    progress = 0
    
    # Basic info (10%)
    if partner.get('company_name') and partner.get('contact_person_email'):
        progress += 10
    
    # Documents uploaded (20%)
    if partner.get('documents') and len(partner['documents']) >= 2:
        progress += 20
    
    # Tier assigned (10%)
    if partner.get('tier'):
        progress += 10
    
    # Sent to L1 (15%)
    if partner['status'] in ['pending_l1', 'pending_l2', 'approved']:
        progress += 15
    
    # L1 approved (15%)
    if partner['status'] in ['pending_l2', 'approved']:
        progress += 15
    
    # L2 approved (15%)
    if partner['status'] == 'approved':
        progress += 15
    
    # Products assigned (15%)
    if partner.get('assigned_products') and len(partner['assigned_products']) > 0:
        progress += 15
    
    return min(progress, 100)

# ============= ONBOARDING ENDPOINTS =============

@partner_router.post("/self-register")
async def partner_self_register(partner_data: PartnerCreate):
    """
    Partner self-registration (no authentication required)
    Creates partner user account and partner record
    Status: draft → Admin/PM reviews and assigns tier → pending_l1 → pending_l2 → approved
    """
    # Check if email already exists
    existing_user = await db.users.find_one({"email": partner_data.contact_person_email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if password is provided
    if not partner_data.password:
        raise HTTPException(status_code=400, detail="Password is required for self-registration")
    
    # Create user account for the partner
    user_id = str(uuid4())
    hashed_password = hash_password(partner_data.password)
    
    user_doc = {
        "id": user_id,
        "email": partner_data.contact_person_email,
        "full_name": partner_data.contact_person_name,
        "password_hash": hashed_password,
        "role": "partner",
        "active": False,  # Inactive until approved
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Initialize approval workflow
    approval_workflow = [
        PartnerApprovalStep(level=1, status="pending").model_dump(),
        PartnerApprovalStep(level=2, status="pending").model_dump()
    ]
    
    # Calculate initial progress based on documents
    initial_progress = 20
    if partner_data.documents and len(partner_data.documents) >= 2:
        initial_progress = 30
    
    # Create partner without tier - same structure as admin creation
    partner = Partner(
        **partner_data.model_dump(exclude={'tier', 'password'}),
        tier=None,  # Tier will be assigned by L1 approver
        status="pending_l1",  # Goes directly to L1 approval queue
        created_by=user_id,
        created_by_role="partner",
        user_id=user_id,
        approval_workflow=approval_workflow,
        onboarding_progress=initial_progress,
        submitted_at=datetime.now(timezone.utc)
    )
    
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    # Convert datetime fields
    for field in ['submitted_at', 'reviewed_at', 'l1_approved_at', 'l2_approved_at', 'approved_at']:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    # Convert nested datetime in documents, notes, contacts
    for document in doc.get('documents', []):
        if isinstance(document.get('uploaded_at'), datetime):
            document['uploaded_at'] = document['uploaded_at'].isoformat()
        if document.get('verified_at'):
            document['verified_at'] = document['verified_at'].isoformat()
    
    for note in doc.get('notes', []):
        if isinstance(note.get('created_at'), datetime):
            note['created_at'] = note['created_at'].isoformat()
    
    await db.partners.insert_one(doc)
    await create_audit_log(user_id, "partner_self_registered", "partner", partner.id, None, doc)
    
    return {
        "message": "Partner application submitted for review. You will be notified via email once approved.", 
        "partner_id": partner.id,
        "user_id": user_id
    }

@partner_router.post("/create")
async def create_partner_by_manager(partner_data: PartnerCreate, current_user: User = Depends(get_current_user)):
    """
    Admin/Partner Manager creates partner and submits directly to L1 approval
    Can optionally assign tier at creation
    Status: pending_l1 (goes directly to L1 approval queue)
    """
    if not can_manage_partners(current_user):
        raise HTTPException(status_code=403, detail="Only admin or partner manager can create partners")
    
    # Initialize approval workflow
    approval_workflow = [
        PartnerApprovalStep(level=1, status="pending").model_dump(),
        PartnerApprovalStep(level=2, status="pending").model_dump()
    ]
    
    # Calculate initial progress
    initial_progress = 20
    if partner_data.documents and len(partner_data.documents) >= 2:
        initial_progress = 30
    if partner_data.tier:
        initial_progress = 35
    
    partner = Partner(
        **partner_data.model_dump(),
        status="pending_l1",  # Goes directly to L1 approval
        created_by=current_user.id,
        created_by_role=current_user.role,
        approval_workflow=approval_workflow,
        onboarding_progress=initial_progress,
        submitted_at=datetime.now(timezone.utc)
    )
    
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    # Convert datetime fields
    for field in ['submitted_at', 'reviewed_at', 'l1_approved_at', 'l2_approved_at', 'approved_at']:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    # Convert nested objects
    for step in doc['approval_workflow']:
        if step.get('action_date'):
            step['action_date'] = step['action_date'].isoformat()
    
    for document in doc.get('documents', []):
        if isinstance(document.get('uploaded_at'), datetime):
            document['uploaded_at'] = document['uploaded_at'].isoformat()
        if document.get('verified_at'):
            document['verified_at'] = document['verified_at'].isoformat()
    
    await db.partners.insert_one(doc)
    await create_audit_log(current_user.id, "partner_created_by_manager", "partner", partner.id, None, doc)
    
    return {"message": "Partner created successfully", "partner_id": partner.id}

# ============= REVIEW & TIER ASSIGNMENT =============

@partner_router.get("/pending-review")
async def get_pending_review_partners(current_user: User = Depends(get_current_user)):
    """Get all self-registered partners pending review (for Admin/PM)"""
    if not can_manage_partners(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partners = await db.partners.find({
        "status": "pending_review",
        "created_by_role": "partner"
    }, {"_id": 0}).to_list(1000)
    
    # Convert dates
    for p in partners:
        for key in ['created_at', 'updated_at', 'submitted_at', 'reviewed_at']:
            if key in p and p[key] and isinstance(p[key], str):
                try:
                    p[key] = datetime.fromisoformat(p[key])
                except:
                    pass
    
    return partners

# ============= OLD REVIEW ENDPOINT (DEPRECATED - NOT USED IN NEW FLOW) =============
# Partners now go directly to L1 queue, no separate review step
# Kept commented for reference only

# @partner_router.patch("/{partner_id}/review")
# async def review_and_assign_tier(...):
#     # DEPRECATED - Partners go directly to pending_l1 status
#     pass

# ============= DOCUMENT MANAGEMENT =============

@partner_router.post("/{partner_id}/upload-document")
async def upload_document(partner_id: str, doc_data: dict, current_user: User = Depends(get_current_user)):
    """Upload document for partner"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Check authorization
    if not (can_manage_partners(current_user) or partner.get('user_id') == current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_document = PartnerDocument(
        document_type=doc_data['document_type'],
        document_name=doc_data['document_name'],
        document_data=doc_data.get('document_data'),
        file_size=doc_data.get('file_size')
    )
    
    documents = partner.get('documents', [])
    doc_dict = new_document.model_dump()
    doc_dict['uploaded_at'] = doc_dict['uploaded_at'].isoformat()
    if doc_dict.get('verified_at'):
        doc_dict['verified_at'] = doc_dict['verified_at'].isoformat()
    
    documents.append(doc_dict)
    
    # Update progress
    partner['documents'] = documents
    progress = await calculate_onboarding_progress(partner)
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "documents": documents,
            "onboarding_progress": progress,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await create_audit_log(current_user.id, "document_uploaded", "partner", partner_id, None, {"document_type": doc_data['document_type']})
    
    return {"message": "Document uploaded successfully"}

# ============= WORKFLOW MANAGEMENT =============

# ============= OLD SEND-TO-L1 ENDPOINT (DEPRECATED - NOT USED IN NEW FLOW) =============
# Partners now go directly to L1 queue upon creation/self-registration
# No manual "send to L1" step needed

# @partner_router.post("/{partner_id}/send-to-l1")
# async def send_to_l1_approval(...):
#     # DEPRECATED - Partners created with status pending_l1 directly
#     pass

@partner_router.get("/rejected")
async def get_rejected_partners(current_user: User = Depends(get_current_user)):
    """
    Get rejected partners
    - For admin/PM: Show all rejected partners
    - For partners: Show only their own rejected application
    """
    query = {"status": {"$in": ["rejected_by_l1", "rejected_by_l2"]}}
    
    # If partner user, only show their own
    if current_user.role == "partner":
        query["user_id"] = current_user.id
    
    partners = await db.partners.find(query, {"_id": 0}).sort("rejected_at", -1).to_list(1000)
    
    for p in partners:
        for key in ['created_at', 'updated_at', 'rejected_at']:
            if key in p and p[key] and isinstance(p[key], str):
                try:
                    p[key] = datetime.fromisoformat(p[key])
                except:
                    pass
    
    return partners

@partner_router.get("/on-hold")
async def get_on_hold_partners(current_user: User = Depends(get_current_user)):
    """
    Get partners on hold
    - For admin/PM/Approvers: Show all on-hold partners
    - For partners: Show only their own on-hold applications
    """
    query = {"status": "on_hold"}
    
    # If partner user, only show their own
    if current_user.role == "partner":
        query["user_id"] = current_user.id
    
    partners = await db.partners.find(query, {"_id": 0}).sort("hold_date", -1).to_list(1000)
    
    for p in partners:
        for key in ['created_at', 'updated_at', 'hold_date']:
            if key in p and p[key] and isinstance(p[key], str):
                try:
                    p[key] = datetime.fromisoformat(p[key])
                except:
                    pass
    
    return partners

@partner_router.get("/l1-queue")
async def get_l1_queue(current_user: User = Depends(get_current_user)):
    """Get L1 approval queue (for L1 approvers)"""
    if not can_approve_l1(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partners = await db.partners.find({"status": "pending_l1"}, {"_id": 0}).to_list(1000)
    
    for p in partners:
        for key in ['created_at', 'updated_at', 'submitted_at']:
            if key in p and p[key] and isinstance(p[key], str):
                try:
                    p[key] = datetime.fromisoformat(p[key])
                except:
                    pass
    
    return partners

@partner_router.post("/{partner_id}/l1-approve")
async def approve_l1(partner_id: str, approval_data: dict, current_user: User = Depends(get_current_user)):
    """
    L1 approver approves partner and sends to L2
    MUST assign tier during L1 approval if not already assigned
    Required: tier must be assigned before approval
    """
    if not can_approve_l1(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner['status'] != 'pending_l1':
        raise HTTPException(status_code=400, detail="Partner is not in L1 approval queue")
    
    # L1 MUST assign tier during approval - tier is required in approval_data
    tier = approval_data.get('tier')
    if not tier:
        raise HTTPException(status_code=400, detail="Tier must be assigned during L1 approval")
    
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
        "status": "pending_l2",
        "tier": tier,
        "tier_assigned_by": current_user.id,
        "approval_workflow": approval_workflow,
        "l1_approved_by": current_user.id,
        "l1_approved_at": datetime.now(timezone.utc).isoformat(),
        "onboarding_progress": 60,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Clear any previous rejection data
    update_data["rejection_reason"] = None
    update_data["rejected_by"] = None
    update_data["rejected_at"] = None
    update_data["rejected_level"] = None
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l1_approved", "partner", partner_id, partner, update_data)
    
    return {"message": "L1 approval completed. Partner moved to L2 queue.", "tier": tier}

@partner_router.post("/{partner_id}/l1-reject")
async def reject_l1(partner_id: str, rejection_data: dict, current_user: User = Depends(get_current_user)):
    """
    L1 approver rejects partner
    - If created by admin → Status: rejected_by_l1 (admin must fix and resubmit)
    - If self-registered → Status: rejected_by_l1 (partner can see reason and resubmit)
    """
    if not can_approve_l1(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner['status'] != 'pending_l1':
        raise HTTPException(status_code=400, detail="Partner is not in L1 approval queue")
    
    reason = rejection_data.get('reason', '')
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    approval_workflow = partner.get('approval_workflow', [])
    
    # Update L1 step
    for step in approval_workflow:
        if step['level'] == 1:
            step['status'] = 'rejected'
            step['approver_id'] = current_user.id
            step['approver_name'] = current_user.full_name
            step['action_date'] = datetime.now(timezone.utc).isoformat()
            step['rejection_reason'] = reason
            step['comments'] = rejection_data.get('comments', '')
            break
    
    rejection_count = partner.get('rejection_count', 0) + 1
    created_by_role = partner.get('created_by_role', 'admin')
    
    update_data = {
        "status": "rejected_by_l1",
        "rejection_reason": reason,
        "rejected_by": current_user.id,
        "rejected_by_name": current_user.full_name,
        "rejected_at": datetime.now(timezone.utc).isoformat(),
        "rejected_level": "L1",
        "approval_workflow": approval_workflow,
        "rejection_count": rejection_count,
        "onboarding_progress": 25,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If partner self-registered, set user account to inactive
    if created_by_role == "partner" and partner.get('user_id'):
        await db.users.update_one(
            {"id": partner['user_id']},
            {"$set": {"active": False}}
        )
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l1_rejected", "partner", partner_id, partner, update_data)
    
    return {
        "message": f"Partner rejected at L1. Sent back to {created_by_role} for revision.",
        "created_by_role": created_by_role
    }

@partner_router.get("/l2-queue")
async def get_l2_queue(current_user: User = Depends(get_current_user)):
    """Get L2 approval queue (for L2 approvers)"""
    if not can_approve_l2(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partners = await db.partners.find({"status": "pending_l2"}, {"_id": 0}).to_list(1000)
    
    for p in partners:
        for key in ['created_at', 'updated_at', 'submitted_at', 'l1_approved_at']:
            if key in p and p[key] and isinstance(p[key], str):
                try:
                    p[key] = datetime.fromisoformat(p[key])
                except:
                    pass
    
    return partners

@partner_router.post("/{partner_id}/l2-approve")
async def approve_l2(partner_id: str, approval_data: dict, current_user: User = Depends(get_current_user)):
    """L2 approver gives final approval"""
    if not can_approve_l2(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner['status'] != 'pending_l2':
        raise HTTPException(status_code=400, detail="Partner is not in L2 approval queue")
    
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
        "l2_approved_by": current_user.id,
        "l2_approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "onboarding_progress": 100,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Clear any rejection data
    update_data["rejection_reason"] = None
    update_data["rejected_by"] = None
    update_data["rejected_at"] = None
    update_data["rejected_level"] = None
    
    # Activate user if exists (for self-registered partners)
    if partner.get('user_id'):
        await db.users.update_one({"id": partner['user_id']}, {"$set": {"active": True}})
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l2_approved", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner fully approved! Onboarding complete. Partner can now receive sales commissions."}

@partner_router.post("/{partner_id}/l2-reject")
async def reject_l2(partner_id: str, rejection_data: dict, current_user: User = Depends(get_current_user)):
    """
    L2 approver rejects partner
    - If created by admin → Status: rejected_by_l2 (admin must fix and resubmit)
    - If self-registered → Status: rejected_by_l2 (partner can see reason and resubmit)
    """
    if not can_approve_l2(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner['status'] != 'pending_l2':
        raise HTTPException(status_code=400, detail="Partner is not in L2 approval queue")
    
    reason = rejection_data.get('reason', '')
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    approval_workflow = partner.get('approval_workflow', [])
    
    # Update L2 step
    for step in approval_workflow:
        if step['level'] == 2:
            step['status'] = 'rejected'
            step['approver_id'] = current_user.id
            step['approver_name'] = current_user.full_name
            step['action_date'] = datetime.now(timezone.utc).isoformat()
            step['rejection_reason'] = reason
            step['comments'] = rejection_data.get('comments', '')
            break
    
    rejection_count = partner.get('rejection_count', 0) + 1
    created_by_role = partner.get('created_by_role', 'admin')
    
    update_data = {
        "status": "rejected_by_l2",
        "rejection_reason": reason,
        "rejected_by": current_user.id,
        "rejected_by_name": current_user.full_name,
        "rejected_at": datetime.now(timezone.utc).isoformat(),
        "rejected_level": "L2",
        "approval_workflow": approval_workflow,
        "rejection_count": rejection_count,
        "onboarding_progress": 50,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If partner self-registered, keep user account but inactive
    if created_by_role == "partner" and partner.get('user_id'):
        await db.users.update_one(
            {"id": partner['user_id']},
            {"$set": {"active": False}}
        )
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_l2_rejected", "partner", partner_id, partner, update_data)
    
    return {
        "message": f"Partner rejected at L2. Sent back to {created_by_role} for revision.",
        "created_by_role": created_by_role
    }

# ============= RESUBMISSION FOR REJECTED PARTNERS =============

@partner_router.post("/{partner_id}/resubmit")
async def resubmit_partner(partner_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    """
    Resubmit rejected partner after making corrections
    - Admin/PM can resubmit partners they created
    - Partners can resubmit their own applications
    - Resets approval workflow and sends to L1 again
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Check status - only rejected partners can be resubmitted
    if partner['status'] not in ['rejected_by_l1', 'rejected_by_l2']:
        raise HTTPException(status_code=400, detail="Only rejected partners can be resubmitted")
    
    # Check permissions
    created_by = partner.get('created_by')
    created_by_role = partner.get('created_by_role')
    
    if created_by_role == 'partner':
        # Partner resubmitting their own application
        if current_user.role != 'partner' or current_user.id != created_by:
            raise HTTPException(status_code=403, detail="You can only resubmit your own application")
    else:
        # Admin/PM resubmitting
        if not can_manage_partners(current_user):
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Reset approval workflow
    approval_workflow = [
        PartnerApprovalStep(level=1, status="pending").model_dump(),
        PartnerApprovalStep(level=2, status="pending").model_dump()
    ]
    
    # Build resubmission data
    resubmit_data = {
        "status": "pending_l1",
        "approval_workflow": approval_workflow,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "resubmitted_at": datetime.now(timezone.utc).isoformat(),
        "resubmission_count": partner.get('resubmission_count', 0) + 1,
        "onboarding_progress": 35,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Allow updating partner details during resubmission
    allowed_updates = [
        'company_name', 'business_type', 'tax_id', 'years_in_business',
        'number_of_employees', 'expected_monthly_volume', 'business_address',
        'website', 'contact_person_name', 'contact_person_email',
        'contact_person_phone', 'contact_person_designation', 'documents',
        'tier'
    ]
    
    for key in allowed_updates:
        if key in update_data:
            resubmit_data[key] = update_data[key]
    
    # Clear rejection data but keep history
    resubmit_data['previous_rejection_reason'] = partner.get('rejection_reason')
    resubmit_data['previous_rejected_level'] = partner.get('rejected_level')
    resubmit_data['rejection_reason'] = None
    resubmit_data['rejected_by'] = None
    resubmit_data['rejected_at'] = None
    resubmit_data['rejected_level'] = None
    
    # For documents, convert to proper format if needed
    if 'documents' in resubmit_data:
        docs = []
        for doc in resubmit_data['documents']:
            if isinstance(doc, dict):
                docs.append(doc)
        resubmit_data['documents'] = docs
    
    await db.partners.update_one({"id": partner_id}, {"$set": resubmit_data})
    await create_audit_log(current_user.id, "partner_resubmitted", "partner", partner_id, partner, resubmit_data)
    
    return {
        "message": "Partner resubmitted successfully. Sent to L1 approval queue.",
        "status": "pending_l1"
    }

# ============= ADMIN/PM ACTIONS ON REJECTED/HOLD =============

@partner_router.post("/{partner_id}/put-on-hold")
async def put_on_hold(partner_id: str, hold_data: dict, current_user: User = Depends(get_current_user)):
    """
    Admin/PM/Approver puts partner on hold with comments
    Partner can see the reason and update their application
    """
    # Allow admin, partner_manager, l1_approver, l2_approver to put on hold
    if not (can_manage_partners(current_user) or can_approve_l1(current_user) or can_approve_l2(current_user)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    reason = hold_data.get('reason', '')
    comments = hold_data.get('comments', '')
    
    if not reason:
        raise HTTPException(status_code=400, detail="Reason for hold is required")
    
    # Store previous status to return to after hold is resolved
    previous_status = partner.get('status')
    
    update_data = {
        "status": "on_hold",
        "on_hold": True,
        "hold_reason": reason,
        "partner_feedback_required": True,
        "partner_feedback_message": comments or reason,
        "previous_status_before_hold": previous_status,
        "hold_initiated_by": current_user.id,
        "hold_initiated_by_name": current_user.full_name,
        "hold_date": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_put_on_hold", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner put on hold. Partner will be notified to make corrections."}

@partner_router.post("/{partner_id}/send-back-to-partner")
async def send_back_to_partner(partner_id: str, feedback_data: dict, current_user: User = Depends(get_current_user)):
    """Admin/PM sends feedback to self-registered partner to make corrections"""
    if not can_manage_partners(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner.get('created_by_role') != 'partner':
        raise HTTPException(status_code=400, detail="This action is only for self-registered partners")
    
    update_data = {
        "status": "more_info_needed",
        "partner_feedback_required": True,
        "partner_feedback_message": feedback_data.get('message', ''),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "feedback_sent_to_partner", "partner", partner_id, partner, update_data)
    
    return {"message": "Feedback sent to partner for corrections"}

@partner_router.post("/{partner_id}/reject-permanently")
async def reject_permanently(partner_id: str, rejection_data: dict, current_user: User = Depends(get_current_user)):
    """Admin/PM permanently rejects partner"""
    if not can_manage_partners(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {
        "status": "rejected",
        "hold_reason": rejection_data.get('reason', ''),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Deactivate user if exists
    if partner.get('user_id'):
        await db.users.update_one({"id": partner['user_id']}, {"$set": {"active": False}})
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "partner_rejected_permanently", "partner", partner_id, partner, update_data)
    
    return {"message": "Partner permanently rejected"}

# ============= PRODUCT & COMMISSION ASSIGNMENT =============

@partner_router.post("/{partner_id}/assign-products-commission")
async def assign_products_and_commission(
    partner_id: str,
    assignment_data: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Admin/PM assigns products with custom margins and payout period
    Only possible after L1 & L2 approval
    """
    if not can_manage_partners(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner['status'] != 'approved':
        raise HTTPException(status_code=400, detail="Partner must be approved before product assignment")
    
    product_assignments = []
    for product_data in assignment_data.get('products', []):
        # Get product details
        product = await db.products.find_one({"id": product_data['product_id']}, {"_id": 0})
        if product:
            custom_margin = product_data.get('custom_margin', 0)
            base_rate = float(product['base_commission_rate'])
            final_rate = base_rate + float(custom_margin)
            
            product_commission = ProductCommission(
                product_id=product['id'],
                product_name=product['name'],
                base_commission_rate=str(base_rate),
                custom_margin=str(custom_margin) if custom_margin else None,
                final_rate=str(final_rate)
            )
            product_assignments.append(product_commission.model_dump())
    
    update_data = {
        "assigned_products": product_assignments,
        "payout_period": assignment_data.get('payout_period', 'monthly'),
        "onboarding_progress": 100,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "products_commission_assigned", "partner", partner_id, partner, update_data)
    
    return {"message": f"Successfully assigned {len(product_assignments)} products with commission details"}

# ============= NOTES & COMMUNICATION =============

@partner_router.post("/{partner_id}/add-note")
async def add_note(partner_id: str, note_data: dict, current_user: User = Depends(get_current_user)):
    """Add internal note or partner-visible communication"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Check authorization
    if not (can_manage_partners(current_user) or partner.get('user_id') == current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    note = PartnerNote(
        created_by=current_user.id,
        created_by_name=current_user.full_name,
        note=note_data['note'],
        visibility=note_data.get('visibility', 'internal')
    )
    
    notes = partner.get('notes', [])
    note_dict = note.model_dump()
    note_dict['created_at'] = note_dict['created_at'].isoformat()
    notes.append(note_dict)
    
    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"notes": notes, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Note added successfully"}

# ============= DIRECTORY & PORTAL =============

@partner_router.get("/directory")
async def get_partner_directory(current_user: User = Depends(get_current_user)):
    """Get all partners (admin/pm see all, partners see their own)"""
    if can_manage_partners(current_user):
        partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    elif current_user.role == "partner":
        partners = await db.partners.find({"user_id": current_user.id}, {"_id": 0}).to_list(10)
    else:
        partners = []
    
    # Convert dates
    for p in partners:
        for key in ['created_at', 'updated_at', 'submitted_at', 'reviewed_at', 'l1_approved_at', 'l2_approved_at', 'approved_at']:
            if key in p and p[key] and isinstance(p[key], str):
                try:
                    p[key] = datetime.fromisoformat(p[key])
                except:
                    pass
    
    return partners

@partner_router.get("/{partner_id}/portal")
async def get_partner_portal(partner_id: str, current_user: User = Depends(get_current_user)):
    """Get detailed partner information"""
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Check authorization
    if not (can_manage_partners(current_user) or partner.get('user_id') == current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get assigned products details
    assigned_products = []
    for product_comm in partner.get('assigned_products', []):
        product = await db.products.find_one({"id": product_comm['product_id']}, {"_id": 0})
        if product:
            product_comm['product_details'] = product
            assigned_products.append(product_comm)
    
    # Convert dates
    for key in ['created_at', 'updated_at', 'submitted_at', 'reviewed_at', 'l1_approved_at', 'l2_approved_at', 'approved_at']:
        if key in partner and partner[key] and isinstance(partner[key], str):
            try:
                partner[key] = datetime.fromisoformat(partner[key])
            except:
                pass
    
    return {
        "partner": partner,
        "assigned_products": assigned_products
    }

@partner_router.get("/my-applications")
async def get_my_applications(current_user: User = Depends(get_current_user)):
    """Partners can see their own applications"""
    if current_user.role != "partner":
        raise HTTPException(status_code=403, detail="Only partners can view their applications")
    
    partners = await db.partners.find({"user_id": current_user.id}, {"_id": 0}).to_list(100)
    
    # Convert dates
    for p in partners:
        for key in ['created_at', 'updated_at', 'submitted_at']:
            if key in p and p[key] and isinstance(p[key], str):
                try:
                    p[key] = datetime.fromisoformat(p[key])
                except:
                    pass
    
    return partners
